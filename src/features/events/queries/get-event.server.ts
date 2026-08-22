import { cache } from 'react';
import type { EventResponse, TicketProductsResponse } from '../types/event.types';
import { isEventId } from '../utils/slug';

// Server-side fetches use native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). These are public
// endpoints — no Authorization header needed.
// API_INTERNAL_URL hits the backend directly over the docker network in prod/staging;
// falls back to NEXT_PUBLIC_API_URL in local dev where there's only one host.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

export const fetchEvent = cache(async (id: string): Promise<EventResponse> => {
  const res = await fetch(`${apiBase()}/events/${id}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`fetchEvent ${id}: ${res.status}`);
  return res.json() as Promise<EventResponse>;
});

export const fetchEventBySlug = cache(async (slug: string): Promise<EventResponse> => {
  const res = await fetch(`${apiBase()}/events/by-slug/${slug}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`fetchEventBySlug ${slug}: ${res.status}`);
  return res.json() as Promise<EventResponse>;
});

/**
 * Resolves the `/events/[id]` segment, which accepts a UUID or a slug.
 * Returns null instead of throwing so callers (metadata, OG image) can fall back
 * to generic copy rather than 500 on a dead link. Both fetches are React-cached,
 * so repeated calls within one request share a single round-trip.
 */
export async function fetchEventByParam(param: string): Promise<EventResponse | null> {
  try {
    return isEventId(param) ? await fetchEvent(param) : await fetchEventBySlug(param);
  } catch {
    return null;
  }
}

export const fetchTicketProducts = cache(async (eventId: string): Promise<TicketProductsResponse> => {
  const res = await fetch(`${apiBase()}/shows/${eventId}/tickets`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`fetchTicketProducts ${eventId}: ${res.status}`);
  return res.json() as Promise<TicketProductsResponse>;
});

// Backward-compat alias used by watch/replay/live pages.
export const getEventCached = fetchEvent;
