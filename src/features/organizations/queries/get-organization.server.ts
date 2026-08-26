import { cache } from 'react';
import type { OrganizationResponse } from '../types/organization.types';
import type { EventResponse } from '@/features/events/types/event.types';

// Server-side fetch: native fetch, not the axios httpClient (browser-only auth
// interceptors). Public endpoints — no Authorization header. Mirrors
// get-event.server.ts. Never throws — a missing org must render the client's
// not-found state, not 500 the route.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fetchOrganizationByParam = cache(
  async (idOrSlug: string): Promise<OrganizationResponse | null> => {
    const path = UUID_RE.test(idOrSlug)
      ? `/organizations/public/by-id/${idOrSlug}`
      : `/organizations/public/${idOrSlug}`;
    try {
      const res = await fetch(`${apiBase()}${path}`, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      return (await res.json()) as OrganizationResponse;
    } catch {
      return null;
    }
  },
);

export const fetchOrganizationEvents = cache(
  async (orgId: string, filter: 'upcoming' | 'past' | 'all'): Promise<EventResponse[]> => {
    try {
      const res = await fetch(
        `${apiBase()}/organizations/public/by-id/${orgId}/events?filter=${filter}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) return [];
      return (await res.json()) as EventResponse[];
    } catch {
      return [];
    }
  },
);
