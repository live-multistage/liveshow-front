import { cache } from 'react';
import type { EventResponse, ListEventsParams, PaginatedEventsResponse } from '../types/event.types';

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

// Builds the /events query string from only the keys that are actually set —
// keeps the request minimal and matches what parseListParams hands back.
function buildQuery(params: ListEventsParams): string {
  const sp = new URLSearchParams();
  if (params.filter) sp.set('filter', params.filter);
  if (params.category) sp.set('category', params.category);
  if (params.subtype) sp.set('subtype', params.subtype);
  if (params.tag) sp.set('tag', params.tag);
  if (params.city) sp.set('city', params.city);
  if (params.free) sp.set('free', '1');
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  return sp.toString();
}

// Any page of the /events listing — seeds the numbered-pagination client
// query. Accepts the full filter set (category/subtype/tag/city/free) so SSR
// and the client query agree on exactly what was requested.
export const fetchFeedPage = cache(async (params: ListEventsParams): Promise<PaginatedEventsResponse> => {
  const merged: ListEventsParams = { filter: 'all', page: 1, pageSize: 24, ...params };
  const { page, pageSize } = merged;
  try {
    const res = await fetch(`${apiBase()}/events?${buildQuery(merged)}`, { next: { revalidate: 30 } });
    if (!res.ok) return { ...EMPTY, page, pageSize };
    return (await res.json()) as PaginatedEventsResponse;
  } catch {
    return { ...EMPTY, page, pageSize };
  }
});
