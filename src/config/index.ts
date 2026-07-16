const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// LAN access (e.g. phone hitting https://192.168.x.x:3000): a localhost API
// URL would point at the phone itself, and swapping the host still dies as
// mixed content (https page → http API; browsers only exempt localhost).
// Serve those clients through the same-origin /api proxy (next.config
// rewrites) instead. Desktop on localhost keeps hitting the API directly —
// zero behavior change there.
const isLanBrowser =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  /\/\/(localhost|127\.0\.0\.1)/.test(rawApiUrl);

export const config = {
  apiUrl: isLanBrowser ? '/api' : rawApiUrl,
  appName: 'Liveshow',
} as const;
