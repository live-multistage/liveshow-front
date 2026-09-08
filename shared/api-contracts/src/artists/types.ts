import type { PaginatedEventsResponse } from '../events/types';

export type ArtistStatus = 'ACTIVE' | 'HIDDEN';

export interface ArtistListItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  eventCount?: number;
}

export interface ArtistResponse extends ArtistListItem {
  description?: string;
  bannerUrl?: string;
  genres?: string[];
  socialLinks?: { platform: string; url: string }[];
  organization?: { id: string; slug: string; name: string };
}

export type ArtistEventsFilter = 'upcoming' | 'past' | 'all';

// GET /artists/:slug/events reuses the paginated event shape — no separate
// artist-events type, same as how organization event listings are typed.
export type ArtistEventsResponse = PaginatedEventsResponse;
