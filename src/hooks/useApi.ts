import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useApi() {
  const { token, logout } = useAuth();

  const request = useCallback(async <T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(path, { ...options, headers });

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    return res.json();
  }, [token, logout]);

  const get    = useCallback(<T>(path: string) => request<T>(path), [request]);
  const post   = useCallback(<T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }), [request]);
  const put    = useCallback(<T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',  body: JSON.stringify(body) }), [request]);
  const del    = useCallback(<T>(path: string) => request<T>(path, { method: 'DELETE' }), [request]);

  return { get, post, put, del };
}
