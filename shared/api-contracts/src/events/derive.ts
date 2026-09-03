import type { EventResponse, TicketProductResponse } from './types';

export const FALLBACK_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1619973226698-b77a5b5dd14b?auto=format&fit=crop&w=1080&q=80';

export const isLive = (e: Pick<EventResponse, 'status'>) => e.status === 'LIVE';
export const isFinished = (e: Pick<EventResponse, 'status'>) => e.status === 'FINISHED';
export const hasReplay = (e: Pick<EventResponse, 'status' | 'format'>) => e.status === 'FINISHED' || e.format === 'VOD';
export const isPurchasable = (e: Pick<EventResponse, 'status' | 'format'>) =>
  e.status === 'PUBLISHED' ||
  e.status === 'SCHEDULED' ||
  e.status === 'LIVE' ||
  (e.status === 'FINISHED' && hasReplay(e));
export const coverUrl = (e: Pick<EventResponse, 'thumbnailUrl' | 'bannerUrl'>, fallback = FALLBACK_EVENT_IMAGE) =>
  e.thumbnailUrl ?? e.bannerUrl ?? fallback;
export const bannerUrl = (e: Pick<EventResponse, 'thumbnailUrl' | 'bannerUrl'>, fallback = FALLBACK_EVENT_IMAGE) =>
  e.bannerUrl ?? e.thumbnailUrl ?? fallback;
export function priceRange(e: Pick<EventResponse, 'priceFromCents' | 'priceToCents'>) {
  if (e.priceFromCents === undefined) return null;
  return { fromCents: e.priceFromCents, toCents: e.priceToCents ?? e.priceFromCents };
}
export function getSoleFreeTicketProduct(tickets: TicketProductResponse[]): TicketProductResponse | null {
  const only = tickets.length === 1 ? tickets[0] : undefined;
  return only && only.price === 0 ? only : null;
}
export const serviceFee = (price: number, rate: number) => Math.round(price * rate * 100) / 100;
export function purchasableTickets(e: Pick<EventResponse, 'status'>, tickets: TicketProductResponse[]) {
  return isFinished(e) ? tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW')) : tickets;
}
