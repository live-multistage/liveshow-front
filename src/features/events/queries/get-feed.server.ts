import { cache } from 'react';
import type { EventResponse } from '../types/event.types';

// Server-side fetches use native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

interface FeedOutput {
  events: Array<{ event: EventResponse; score: number }>;
  total: number;
}

export const fetchFeed = cache(async (): Promise<EventResponse[]> => {
  try {
    const res = await fetch(`${apiBase()}/v1/feed?filter=all`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = (await res.json()) as FeedOutput;
    return data.events.map((item) => item.event);
  } catch {
    return [];
  }
});
