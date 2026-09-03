import type { AccessCapability } from '../common/access-capability';
import type { EventStatus } from '../events/types';
import type { OrderLineEventView } from '../orders/types';

/** One item of `GET /me/accessible-events`. */
export interface AccessibleEvent {
  id: string;
  slug?: string | null;
  title: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  venue: string | null;
  city: string | null;
  /** Union of the capabilities of every grant this user holds for the event. */
  capabilities: AccessCapability[];
  /**
   * Decided by the SERVER from capability × status. Never recompute them on a
   * client: the rule lives in one place, and a second copy would drift in
   * silence — offering a button that playback would then refuse.
   */
  canWatchLive: boolean;
  canWatchReplay: boolean;
}

// Amounts are integer cents (see OrderView).
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

/**
 * `GET /shows/:showId/entry-pass`. There is no expiry field and no expiry in
 * the token: the signer embeds `{gid, eid, iat}` only, and the gate resolves
 * redemption against the database. A client that caches this decides its own
 * refresh window.
 */
export interface EntryPassResponse {
  grantId: string;
  eventId: string;
  entryCode: string;
  // Signed QR payload: base64url(JSON{gid,eid,iat}).base64url(ECDSA-P256 sig)
  qrToken: string;
  redeemedAt: string | null;
}

/** `GET /ticketing/entry-pass/public-key` — for gate devices verifying offline. */
export interface EntryPassPublicKey {
  algorithm: string;
  publicKeyPem: string;
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

/** Events a staff member can gate — feeds the check-in event picker. */
export interface GateableEvent {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  venue: string | null;
  city: string | null;
}
