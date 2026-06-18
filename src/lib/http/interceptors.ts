import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '@/lib/auth/token-store';

function clearSession() {
  tokenStore.clear();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }
}

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

export function applyInterceptors(client: AxiosInstance) {
  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const token = tokenStore.get();
    if (token) req.headers.set('Authorization', `Bearer ${token}`);
    return req;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              original.headers.set('Authorization', `Bearer ${token}`);
              resolve(client(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (!res.ok) throw new Error('refresh_failed');

        const data = await res.json() as { accessToken: string };
        tokenStore.set(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.set('Authorization', `Bearer ${data.accessToken}`);
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
