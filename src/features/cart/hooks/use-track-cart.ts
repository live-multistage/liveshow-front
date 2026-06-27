import { track } from '@/lib/analytics/analytics-client';

export function trackCartAdd(
  eventId: string,
  ticketProductId: string,
  priceCents: number,
  userId?: string,
): void {
  track({
    eventType: 'ticket.cart_added',
    entityType: 'event',
    entityId: eventId,
    properties: { ticket_product_id: ticketProductId, price_cents: priceCents },
    userId,
  });
}

export function trackCartRemove(eventId: string, userId?: string): void {
  track({
    eventType: 'ticket.cart_removed',
    entityType: 'event',
    entityId: eventId,
    userId,
  });
}
