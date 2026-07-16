import type { AccessCapability } from '@/features/events';

// Embedded by the backend (GET /orders/mine) so the buyer's library never
// depends on the public catalog — finished/unpublished/private events still
// render. Null only when the event row itself no longer exists.
export interface OrderEvent {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  venue: string | null;
  city: string | null;
}

export interface OrderResponse {
  orderId: string;
  eventId: string;
  ticketProductId: string;
  ticketProductName: string;
  status: string;
  totalAmount: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  createdAt: string;
  event: OrderEvent | null;
}

export interface PurchasedTicket {
  orderId: string;
  event: OrderEvent;
  ticketProductName: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  totalAmount: number;
  purchasedAt: string;
}

export type TicketFilter = 'all' | 'replay' | 'no-replay' | 'camera';

// ── Physical entry pass (F2) ─────────────────────────────────────

export interface EntryPassResponse {
  grantId: string;
  eventId: string;
  entryCode: string;
  // Signed QR payload: base64url(JSON{gid,eid,iat}).base64url(ECDSA-P256 sig)
  qrToken: string;
  redeemedAt: string | null;
}

export type CheckInStatus = 'OK' | 'ALREADY_USED' | 'INVALID';

export interface CheckInResponse {
  status: CheckInStatus;
  attendeeUserId?: string;
  attendeeName?: string | null;
  redeemedAt?: string | null;
}

export interface CheckInSummaryResponse {
  total: number;
  redeemed: number;
}
