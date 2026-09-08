import type { PaginatedEventsResponse } from '../events/types';

export type ArtistStatus = 'ACTIVE' | 'HIDDEN';

export interface ArtistListItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  eventCount?: number;
  genres?: string[];
}

export interface ArtistResponse extends ArtistListItem {
  description?: string;
  bannerUrl?: string;
  genres?: string[];
  socialLinks?: { platform: string; url: string }[];
  // Artist is independent of any organization: owned by a user (nullable —
  // an admin-created profile can sit unclaimed until the artist signs up).
  ownerUserId?: string | null;
}

export type ArtistEventsFilter = 'upcoming' | 'past' | 'all';

// GET /artists/:slug/events reuses the paginated event shape — no separate
// artist-events type, same as how organization event listings are typed.
export type ArtistEventsResponse = PaginatedEventsResponse;

// Lineup = invitation with consent: an org invites an artist to an event, the
// artist accepts/declines. Public surfaces only ever show ACCEPTED.
export type LineupInvitationStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';

// An event's lineup view (org event-editor: every invited artist + status).
export interface EventLineupItem {
  artist: ArtistListItem;
  status: LineupInvitationStatus;
}

// An artist's own pending/answered invitations (artist self dashboard).
export interface ArtistInvitationItem {
  event: PaginatedEventsResponse['items'][number];
  status: LineupInvitationStatus;
  invitedByOrgId?: string;
}
