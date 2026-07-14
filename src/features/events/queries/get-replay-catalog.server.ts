import type { RecommendedEventsResponse } from '../types/event.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const EMPTY: RecommendedEventsResponse = { items: [], page: 1, pageSize: 10, total: 0 };

// On-demand replay catalog for the home rail. Global (no per-user ranking), so
// no auth cookie is forwarded. Never throws: a hiccup must not break the home.
export async function fetchReplayCatalog(): Promise<RecommendedEventsResponse> {
  try {
    const res = await fetch(`${apiBase()}/events/replay-catalog?page=1&pageSize=12`, {
      cache: 'no-store',
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as RecommendedEventsResponse;
  } catch {
    return EMPTY;
  }
}
