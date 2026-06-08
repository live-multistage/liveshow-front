import type { EventResponse } from '@/features/events';

export interface OrderResponse {
  orderId: string;
  showId: string;
  ticketProductId: string;
  ticketProductName: string;
  status: string;
  totalAmount: number;
  capabilities: ('LIVE_VIEW' | 'REPLAY_VIEW')[];
  createdAt: string;
}

export interface PurchasedTicket {
  orderId: string;
  event: EventResponse;
  ticketProductName: string;
  capabilities: ('LIVE_VIEW' | 'REPLAY_VIEW')[];
  totalAmount: number;
  purchasedAt: string;
}

export type TicketFilter = 'all' | 'replay' | 'no-replay';
