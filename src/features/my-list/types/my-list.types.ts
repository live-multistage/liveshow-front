import type { EventStatus } from '@/features/events/types/event.types';

/**
 * Capabilities de um ingresso. `PHYSICAL_ENTRY` é entrada no LOCAL do evento,
 * não playback — um ingresso presencial não dá direito de assistir.
 */
export type AccessCapability = 'LIVE_VIEW' | 'REPLAY_VIEW' | 'CAMERA_VIEW' | 'PHYSICAL_ENTRY';

/** Um item de `GET /me/accessible-events`. */
export interface AccessibleEvent {
  id: string;
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
