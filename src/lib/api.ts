const API_BASE_URL = 'http://127.0.0.1:8000/api';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  data?: any;

  constructor(message: string, status: number, errors?: Record<string, string[]>, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validates a redirect target path.
 * Accepts only safe relative paths starting with a single "/",
 * rejecting "//", backslashes, control characters, protocol URLs,
 * and any path starting with "/login". Defaults to "/dashboard".
 */
export function getSafeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/dashboard';
  const trimmed = path.trim();
  // Must start with exactly one "/" and reject protocol-relative "//"
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  // Reject backslashes which can be used for open redirects (e.g. /\evil.com)
  if (trimmed.includes('\\')) return '/dashboard';
  // Reject ASCII control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return '/dashboard';
  // Reject protocol indicators (e.g. javascript:, http:, https:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return '/dashboard';
  // Reject any path starting with /login to avoid loops
  if (trimmed === '/login' || trimmed.startsWith('/login?') || trimmed.startsWith('/login/')) {
    return '/dashboard';
  }
  return trimmed;
}

type UnauthorizedHandler = (currentPath?: string) => void;
let onUnauthorizedHandler: UnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedHandler = handler;
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...customOptions,
    headers: defaultHeaders,
  });

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

  // Parse JSON response if available
  const data = response.status !== 204 ? await response.json() : null;

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
