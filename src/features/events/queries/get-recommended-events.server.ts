import { cookies } from 'next/headers';
import type { RecommendedEventsResponse } from '../types/event.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const EMPTY: RecommendedEventsResponse = { items: [], page: 1, pageSize: 10, total: 0 };

// Forwards the access_token cookie when present (mirrors cart.server.ts's
// fetchCartServer) so a logged-in visitor gets personalized ranking — the
// backend endpoint is auth-optional and falls back to popularity ranking
// with no token. Never throws: a ranking hiccup must not break the home
// page. Not wrapped in React's cache() (unlike fetchFeed) since its result
// varies per-caller by cookie, not by argument — cache() would just add
// pointless bookkeeping for a function called once per request anyway.
export async function fetchRecommendedEvents(): Promise<RecommendedEventsResponse> {
  const token = (await cookies()).get('access_token')?.value;
  try {
    const res = await fetch(`${apiBase()}/events/recommended?page=1&pageSize=10`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as RecommendedEventsResponse;
  } catch {
    return EMPTY;
  }
}
