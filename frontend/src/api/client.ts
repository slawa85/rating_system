import { readStoredAuthToken } from '@/shared/utils/authToken';

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL environment variable is not defined');
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = readStoredAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      localStorage.removeItem('authToken');
      // Let AuthContext handle failed session probe without a full-page redirect.
      const path = endpoint.split('?')[0] ?? endpoint;
      if (path !== '/auth/me') {
        window.location.replace('/login');
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    if (response.status === 204) return null as T;
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection and try again');
    }
    if (error instanceof TypeError) {
      throw new Error('Network error - please check your connection and try again');
    }
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<T>(`${endpoint}${query}`, { method: 'GET' });
  },

  post: <T>(endpoint: string, data?: unknown) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: <T = void>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
