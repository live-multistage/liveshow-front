import { cache } from 'react';
import type { EventResponse, PaginatedEventsResponse } from '../types/event.types';

// Server-side fetches use native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const EMPTY: PaginatedEventsResponse = { items: [], page: 1, pageSize: 50, total: 0 };

// First page only (pageSize 50, the API max). Cached in Next's Data Cache
// (revalidate 30s) + React cache() for per-request dedup. Seeds both the home
// feed and the /events listing client queries with the same page they'd fetch.
export const fetchFeedFirstPage = cache(async (): Promise<PaginatedEventsResponse> => {
  try {
    const res = await fetch(`${apiBase()}/events?filter=all&pageSize=50`, { next: { revalidate: 30 } });
    if (!res.ok) return EMPTY;
    return (await res.json()) as PaginatedEventsResponse;
  } catch {
    return EMPTY;
  }
});

// Items-only view of the first page — seeds useListEventsQuery (finite).
export const fetchFeed = async (): Promise<EventResponse[]> => (await fetchFeedFirstPage()).items;
