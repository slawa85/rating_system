const API_URL = import.meta.env.VITE_API_URL;

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) return null as T;
  return response.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient<T>(`${endpoint}${query}`, { method: 'GET' });
  },

  post: <T>(endpoint: string, data?: any) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: <T = void>(endpoint: string) =>
    apiClient<T>(endpoint, { method: 'DELETE' }),
};
