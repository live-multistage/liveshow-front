// Shared (server-renderable) presentation for the editorial home. No 'use
// client', no hooks — these render on the server when called from a server
// component (hero/rails/carousels) and only ride into the client bundle where
// GenreGrid (a client island) imports the helpers. Cards are ShowCard
// (size="compact"), the same one the Programação grid uses.
import type { Show } from '@/features/events/types/show';
import { formatPriceRange } from '@/features/events/utils/event-formatters';
import { eventHref } from '@/features/events/utils/slug';

export const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
export const GENRES_PREVIEW_COUNT = 6;

export function fmtPrice(show: Show) {
  return formatPriceRange(show.priceRange, show.price);
}

export function playHref(show: Show) {
  return show.isLive ? `/live/${show.id}` : eventHref(show);
}

export function infoHref(show: Show) {
  return eventHref(show);
}
