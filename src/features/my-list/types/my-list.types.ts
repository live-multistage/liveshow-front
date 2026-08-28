import type { EventStatus } from '@/features/events/types/event.types';
import type { AccessCapability } from '@live-show/api-contracts';

export type { AccessCapability };

/** Um item de `GET /me/accessible-events`. */
export interface AccessibleEvent {
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
  /** União das capabilities de todas as grants do usuário nesse evento. */
  capabilities: AccessCapability[];
  /**
   * Decididos pelo SERVIDOR a partir de capability × status. Não recalcular
   * aqui: a regra vive em um lugar só, e uma segunda cópia divergiria em
   * silêncio — oferecendo um botão que o playback depois recusaria.
   */
  canWatchLive: boolean;
  canWatchReplay: boolean;
}
