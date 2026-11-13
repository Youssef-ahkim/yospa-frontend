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

  // Handle 401 Unauthorized (expired or missing token)
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yospa_token');
      // Only redirect if not already on the login page to avoid loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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