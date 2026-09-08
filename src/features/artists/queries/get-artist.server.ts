import { cache } from 'react';
import type { ArtistResponse, ArtistListItem, ArtistEventsResponse } from '@live-show/api-contracts';

// Server-side fetch: native fetch, not the axios httpClient (browser-only auth
// interceptors). Public endpoints — no Authorization header. Mirrors
// get-organization.server.ts. Never throws — a missing artist must render the
// client's not-found state, not 500 the route.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

export const fetchArtistByParam = cache(
  async (slugOrId: string): Promise<ArtistResponse | null> => {
    try {
      const res = await fetch(`${apiBase()}/artists/${slugOrId}`, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      return (await res.json()) as ArtistResponse;
    } catch {
      return null;
    }
  },
);

export const fetchArtistEvents = cache(
  async (slugOrId: string): Promise<ArtistEventsResponse | null> => {
    try {
      const res = await fetch(`${apiBase()}/artists/${slugOrId}/events`, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      return (await res.json()) as ArtistEventsResponse;
    } catch {
      return null;
    }
  },
);

export const fetchArtistsFirstPage = cache(
  async (): Promise<{ items: ArtistListItem[]; total: number }> => {
    try {
      const res = await fetch(`${apiBase()}/artists?page=1&pageSize=100`, { next: { revalidate: 300 } });
      if (!res.ok) return { items: [], total: 0 };
      return (await res.json()) as { items: ArtistListItem[]; total: number };
    } catch {
      return { items: [], total: 0 };
    }
  },
);
