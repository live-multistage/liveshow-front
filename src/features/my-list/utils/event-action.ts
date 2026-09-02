import { eventHref } from '@/features/events/utils/slug';
import type { AccessibleEvent } from '../types/my-list.types';

export type EventActionKind = 'watch-live' | 'watch-replay' | 'details' | 'cancelled';

export interface EventAction {
  kind: EventActionKind;
  /** Chave de i18n do rótulo do botão. */
  labelKey: string;
  href: string;
  /** Ação principal (destaque) vs secundária. */
  primary: boolean;
}

/**
 * Traduz um item da lista na ÚNICA ação que ele oferece.
 *
 * `canWatchLive`/`canWatchReplay` vêm decididos pelo servidor — a regra de
 * capability × status vive lá. Esta função só escolhe o destino e o rótulo;
 * não reimplementa a permissão, senão as duas cópias divergem e a página passa
 * a oferecer um botão que o playback recusa.
 */
export function eventAction(event: AccessibleEvent): EventAction {
  if (event.status === 'CANCELLED') {
    return { kind: 'cancelled', labelKey: 'cancelled', href: eventHref(event), primary: false };
  }
  if (event.canWatchLive) {
    return { kind: 'watch-live', labelKey: 'watchLive', href: `/live/${event.id}`, primary: true };
  }
  if (event.canWatchReplay) {
    return { kind: 'watch-replay', labelKey: 'watchReplay', href: `/replay/${event.id}`, primary: true };
  }
  // Cobre tudo o mais: evento futuro, ingresso que não cobre este momento, e
  // ingresso presencial (que dá entrada no local, não playback).
  return { kind: 'details', labelKey: 'details', href: eventHref(event), primary: false };
}

/** Ingresso presencial, sem nenhum direito de playback — merece dizer isso. */
export function isVenueOnly(event: AccessibleEvent): boolean {
  return (
    event.capabilities.includes('PHYSICAL_ENTRY') &&
    !event.capabilities.some((c) => c === 'LIVE_VIEW' || c === 'REPLAY_VIEW' || c === 'CAMERA_VIEW')
  );
}
