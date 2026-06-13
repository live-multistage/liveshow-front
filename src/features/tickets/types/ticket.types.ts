import type { EventResponse, AccessCapability } from '@/features/events';

export interface OrderResponse {
  orderId: string;
  showId: string;
  ticketProductId: string;
  ticketProductName: string;
  status: string;
  totalAmount: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  createdAt: string;
}

export interface PurchasedTicket {
  orderId: string;
  event: EventResponse;
  ticketProductName: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  totalAmount: number;
  purchasedAt: string;
}

export type TicketFilter = 'all' | 'replay' | 'no-replay' | 'camera';
