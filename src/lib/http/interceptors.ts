import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { isLocale } from '@live-show/i18n-messages';
import { tokenStore } from '@/lib/auth/token-store';
import { getAttribution } from '@/lib/analytics/attribution';
import { getAnalyticsConsent } from '@/lib/analytics/consent';
import { generateRequestId } from './request-id';

// The active UI locale, read from <html lang> (set server-side by the root
// layout from next-intl's resolved locale — see src/i18n/request.ts). Only
// meaningful in the browser; SSR/server callers of httpClient get undefined.
export function getUiLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : undefined;
}

// Thrown when the silent refresh itself fails (bad/expired refresh cookie,
// network error, non-2xx from /api/auth/refresh). Exported so callers that
// need to recognize "session is unrecoverably dead" — distinct from a
// same-request 401/403 — can key on the class instead of a string literal.
export class RefreshFailedError extends Error {
  constructor() {
    super('refresh_failed');
    this.name = 'RefreshFailedError';
  }
}

// Reached when a 401 could not be refreshed — the session died mid-flow, so
// carry where the user was and let login put them back. Auth pages are
// excluded: bouncing /login back to /login is noise, not a destination.
// `safeRedirect` guards the consuming side; this only ever builds a
// same-origin path, never a full URL.
function loginUrlPreservingLocation(): string {
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return '/login';
  return `/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`;
}

function clearSession() {
  tokenStore.clear();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = loginUrlPreservingLocation();
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
    // Originated here, not read from a response — this is what lets a
    // request that never got a response (network error, timeout) still be
    // correlatable in nginx/API logs and reported back to the user as
    // AppError.requestId (see errors.ts).
    req.headers.set('X-Request-Id', generateRequestId());

    const token = tokenStore.get();
    if (token) req.headers.set('Authorization', `Bearer ${token}`);

    // Lets account emails (verify/reset/signup-attempt) go out in the
    // locale the user is actually browsing in, not the browser's language.
    if (!req.headers.get('Accept-Language')) {
      const locale = getUiLocale();
      if (locale) req.headers.set('Accept-Language', locale);
    }

    // LGPD: signal opt-out so server-side tracking (e.g. ticket.purchased on
    // checkout) is dropped for users who declined non-essential collection.
    const consent = getAnalyticsConsent();
    if (consent) req.headers.set('x-analytics-consent', consent);

    const attribution = getAttribution();
    if (attribution) {
      req.headers.set('x-attribution-channel', attribution.channel);
      if (attribution.utmSource) req.headers.set('x-attribution-source', attribution.utmSource);
      if (attribution.utmMedium) req.headers.set('x-attribution-medium', attribution.utmMedium);
      if (attribution.utmCampaign) req.headers.set('x-attribution-campaign', attribution.utmCampaign);
      if (attribution.referrerHost) req.headers.set('x-attribution-referrer', attribution.referrerHost);
    }

    return req;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status !== 401 || original._retry || !tokenStore.get()) {
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
        if (!res.ok) throw new RefreshFailedError();

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
