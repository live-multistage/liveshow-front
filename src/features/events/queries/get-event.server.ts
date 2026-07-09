import { cache } from 'react';
import type { EventResponse, TicketProductResponse } from '../types/event.types';

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

export const fetchTicketProducts = cache(async (eventId: string): Promise<TicketProductResponse[]> => {
  const res = await fetch(`${apiBase()}/shows/${eventId}/tickets`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`fetchTicketProducts ${eventId}: ${res.status}`);
  return res.json() as Promise<TicketProductResponse[]>;
});

// Backward-compat alias used by watch/replay/live pages.
export const getEventCached = fetchEvent;
