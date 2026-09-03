import type { EventStatus } from '../events/types';

export interface WishlistItem {
  // The id is the EVENT's, not the wishlist row's: every consumer navigates
  // to the event, and exposing both ids would invite using the wrong one.
  id: string;
  slug?: string | null;
  title: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  venue: string | null;
  city: string | null;
  savedAt: string; // ISO
}
