import type { TicketProductResponse } from '../types/event.types';

/**
 * Returns the event's ticket product when — and only when — it is the event's
 * ONE AND ONLY product and it costs nothing. Otherwise `null`.
 *
 * This is the single condition under which the ticket-purchase UI may be
 * collapsed into a direct "watch" action: there is nothing to choose, so there
 * is nothing to show.
 *
 * Deliberately strict, and the strictness is the point:
 * - a free tier next to paid tiers is NOT this case — the paid tiers usually
 *   carry capabilities the free one lacks (replay, extra cameras), and hiding
 *   them would steer the viewer wrong;
 * - several free products are NOT this case — the viewer still has a choice;
 * - aggregates such as `event.isFree` or a `priceRange` of `{min: 0, max: 0}`
 *   prove the prices are zero but NOT that there is exactly one product, so a
 *   surface holding only those cannot answer this question and must keep the
 *   normal ticket flow.
 */
export function getSoleFreeTicketProduct(
  tickets: TicketProductResponse[],
): TicketProductResponse | null {
  if (tickets.length !== 1) return null;
  return tickets[0].price === 0 ? tickets[0] : null;
}
