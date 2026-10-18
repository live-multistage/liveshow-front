import type { TicketProductResponse } from '../types/event.types';

export type TicketTierState = 'owned' | 'claimable' | 'selectable';

export interface TicketTierView {
  ticket: TicketProductResponse;
  state: TicketTierState;
}

export interface TicketPanelView {
  // Products listed in the panel, in the organizer's order.
  tiers: TicketTierView[];
  // The ones the viewer can still claim or buy.
  buyable: TicketProductResponse[];
  // "Ingresso garantido": nothing left to sell to this viewer.
  secured: boolean;
}

// Amendment 2026-10-18: owning a ticket hides only THAT product ("Seu
// ingresso"), never the others — a free-coverage holder must still see the
// paid full event, before and after the stream starts.
export function buildTicketPanelView(
  tickets: readonly TicketProductResponse[],
  ownedTicketProductIds: readonly string[],
  { isFinished, hasAccess }: { isFinished: boolean; hasAccess: boolean },
): TicketPanelView {
  const owned = new Set(ownedTicketProductIds);
  const tiers = tickets
    // After the event only replay is for sale; what the viewer owns stays listed.
    .filter((t) => owned.has(t.id) || !isFinished || t.capabilities.includes('REPLAY_VIEW'))
    .map((ticket): TicketTierView => ({
      ticket,
      state: owned.has(ticket.id) ? 'owned' : ticket.price === 0 ? 'claimable' : 'selectable',
    }));
  const buyable = tiers.filter((t) => t.state !== 'owned').map((t) => t.ticket);
  // Access with no paid line behind it (comp, organizer grant): there is no
  // product to mark as theirs, so keep the old secured panel instead of
  // selling them what they can already watch.
  const grantedOutsideOrders = hasAccess && owned.size === 0;
  return { tiers, buyable, secured: (tiers.length > 0 && buyable.length === 0) || grantedOutsideOrders };
}
