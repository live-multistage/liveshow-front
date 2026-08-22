import type { EventStatus } from '@/features/events/types/event.types';

export interface WishlistItem {
  // O id é o do EVENTO, não da linha da wishlist: todo consumidor navega para
  // o evento, e expor os dois ids convidaria a usar o errado em um href.
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
