import { cache } from 'react';
import type { EventResponse } from '../types/event.types';

// Server-side fetches use native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

interface PaginatedEventsOutput {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}

// First page only (pageSize 50, the API max) — seeds useListEventsQuery,
// which fetches the same page client-side.
export const fetchFeed = cache(async (): Promise<EventResponse[]> => {
  try {
    const res = await fetch(`${apiBase()}/events?filter=all&pageSize=50`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = (await res.json()) as PaginatedEventsOutput;
    return data.items;
  } catch {
    return [];
  }
});
