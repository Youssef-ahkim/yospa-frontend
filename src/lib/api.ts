import { Role } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: unknown;
  retryAfter?: number;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
    data?: unknown,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validates a redirect target path based on user role.
 * Accepts only safe relative paths starting with a single "/",
 * rejecting "//", backslashes, control characters, protocol URLs,
 * and any path starting with "/login".
 * - "/platform..." is allowed only for a superuser.
 * - "/dashboard..." is allowed only for non-superusers.
 * - Otherwise falls back to the role's home (/platform for superuser, /dashboard for non-superusers).
 */
export function getSafeRedirectPath(
  path: string | null | undefined,
  role?: Role | null
): string {
  const defaultHome = role === 'superuser' ? '/platform' : '/dashboard';
  if (!path || typeof path !== 'string') return defaultHome;
  const trimmed = path.trim();
  // Must start with exactly one "/" and reject protocol-relative "//"
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return defaultHome;
  // Reject backslashes which can be used for open redirects (e.g. /\evil.com)
  if (trimmed.includes('\\')) return defaultHome;
  // Reject ASCII control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return defaultHome;
  // Reject protocol indicators (e.g. javascript:, http:, https:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return defaultHome;
  // Reject any path starting with /login to avoid loops
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed.startsWith('/login/')) {
    return defaultHome;
  }
  // Role checks:
  // If role is explicitly provided, enforce strict role boundaries:
  if (role !== undefined) {
    if (role === 'superuser') {
      return (trimmed === '/platform' || trimmed.startsWith('/platform/')) ? trimmed : defaultHome;
    }
    // Tenant users (owner, admin, staff, or null non-superuser):
    return (trimmed === '/dashboard' || trimmed.startsWith('/dashboard/')) ? trimmed : defaultHome;
  }
  // If role is omitted (e.g. unauthenticated 401 redirect), keep any safe dashboard or platform path:
  if (
    trimmed === '/dashboard' ||
    trimmed.startsWith('/dashboard/') ||
    trimmed === '/platform' ||
    trimmed.startsWith('/platform/')
  ) {
    return trimmed;
  }
  return defaultHome;
}

type UnauthorizedHandler = (currentPath?: string) => void;
let onUnauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedHandler = handler;
}

type DeactivatedHandler = () => void;
let onDeactivatedHandler: DeactivatedHandler | null = null;

export function setOnDeactivatedHandler(handler: DeactivatedHandler | null) {
  onDeactivatedHandler = handler;
}

type RateLimitHandler = (message: string, retryAfter?: number) => void;
let onRateLimitHandler: RateLimitHandler | null = null;

export function setOnRateLimitHandler(handler: RateLimitHandler | null) {
  onRateLimitHandler = handler;
}

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...customOptions } = options;

  // Retrieve token from localStorage if running in the browser and token wasn't explicitly passed
  let authToken = token;
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('yospa_token') || undefined;
  }

  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...customOptions,
      headers: defaultHeaders,
    });
  } catch {
    // Network error, likely offline
    throw new ApiError('Offline', 0);
  }


  // Parse JSON response if available
  let data: (Record<string, unknown> & { message?: string; errors?: Record<string, string[]> }) | null = null;
  if (response.status !== 204) {
    try {
      data = (await response.json()) as Record<string, unknown> & { message?: string; errors?: Record<string, string[]> };
    } catch {
      // Not JSON (e.g., plain text like "Offline"). Fallback to raw text.
      try {
        const text = await response.text();
        data = { message: text };
      } catch {
        data = null;
      }
    }
  }

  // Handle 401 Unauthorized (expired or missing session).
  // Skip expiry handling only when the path is exactly "/login" (so credential failures stay normal errors).
  if (response.status === 401 && endpoint !== '/login') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yospa_token');
      if (onUnauthorizedHandler) {
        const currentPath = window.location.pathname + window.location.search;
        onUnauthorizedHandler(currentPath);
      }
    }
    throw new ApiError('Unauthenticated', 401);
  }

  // Handle 403 Deactivated account ("Your account has been deactivated.")
  // Evicts token and triggers redirect to login with deactivated banner.
  if (response.status === 403 && data?.message === 'Your account has been deactivated.') {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yospa_token');
      if (onDeactivatedHandler) {
        onDeactivatedHandler();
      } else if (window.location.pathname !== '/login') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Hard redirect required to evict session on account deactivation
        window.location.href = '/login?deactivated=1';
      }
    }
    throw new ApiError('Your account has been deactivated.', 403, data?.errors, data);
  }

  // Handle 429 Too Many Requests (Rate Limiting).
  // A 429 must NOT evict the session and must NOT redirect.
  if (response.status === 429) {
    const retryAfterHeader = response.headers.get('Retry-After');
    let retryAfter: number | undefined;
    if (retryAfterHeader) {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        retryAfter = parsed;
      }
    }

    const message = data?.message || 'Too many requests, please slow down';

    if (endpoint !== '/login' && onRateLimitHandler) {
      onRateLimitHandler(message, retryAfter);
    }

    throw new ApiError(message, 429, data?.errors, data, retryAfter);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'An error occurred while fetching the API.',
      response.status,
      data?.errors,
      data
    );
  }

  return data as T;
}
