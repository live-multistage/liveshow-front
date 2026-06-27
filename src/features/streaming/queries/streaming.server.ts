// Server-side access checks using the httpOnly access_token cookie.
// Query keys must match LIVE_KEYS in live.queries.ts exactly so HydrationBoundary
// pre-populates the client cache and TicketPanel renders without a loading flash.

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

type AccessResponse = { authorized: boolean };

async function fetchAccess(url: string, accessToken: string): Promise<boolean> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store', // entitlements must not be cached across users
  });
  // 401/403 = not entitled (not an error worth throwing)
  if (res.status === 401 || res.status === 403 || res.status === 404) return false;
  if (!res.ok) throw new Error(`access check failed: ${res.status}`);
  const data = await res.json() as AccessResponse;
  return data.authorized;
}

export function fetchLiveAccess(eventId: string, accessToken: string): Promise<boolean> {
  return fetchAccess(`${apiBase()}/shows/${eventId}/access/live`, accessToken);
}

export function fetchReplayAccess(eventId: string, accessToken: string): Promise<boolean> {
  return fetchAccess(`${apiBase()}/shows/${eventId}/access/replay`, accessToken);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString()) as { exp: number };
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
