import type { AccessCapability, OrderLineEventView } from '@live-show/api-contracts';

export type { AccessCapability, OrderLineEventView };

// Amounts are integer cents (see @live-show/api-contracts OrderView).
export interface PurchasedTicket {
  orderId: string;
  orderLineId: string;
  event: OrderLineEventView;
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

// /checkin event picker — events the staff member can gate.
export interface GateableEvent {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  venue: string | null;
  city: string | null;
}
