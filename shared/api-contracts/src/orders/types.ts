import type { PaymentAction, PaymentProviderChoice } from '../payments/types';
import type { AccessCapability } from '../common/access-capability';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export interface OrderLineEventView {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  venue: string | null;
  city: string | null;
}

export interface OrderLineView {
  id: string;
  eventId: string;
  ticketProductId: string;
  productName: string;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  event: OrderLineEventView | null;
}

export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discountAmount: number;
  feeAmount: number;
  totalAmount: number;
  couponCode: string | null;
  paymentId: string | null;
  createdAt: string;
  expiresAt: string | null;
  lines: OrderLineView[];
}

export type PaymentFlow = 'CHECKOUT_SESSION' | 'PAYMENT_INTENT';

export interface PlaceOrderRequest {
  provider: PaymentProviderChoice;
  couponCode?: string;
  // Absent = the hosted Checkout Session the web redirects to. The native
  // sheet is opt-in and the backend re-checks the mobile gate for it.
  // GOOGLE_PLAY never sends a flow.
  flow?: PaymentFlow;
  // Only on a STRIPE PAYMENT_INTENT order made on Android: the token Google's
  // user-choice dialog hands the app when the buyer picks our processor. The
  // backend owes Google a report of that transaction within 24h.
  playExternalTransactionToken?: string;
}

export interface PlaceOrderResponse {
  order: OrderView;
  payment: {
    id: string;
    action: PaymentAction;
  };
}

export interface ClaimFreeTicketRequest {
  ticketProductId: string;
}

export interface ClaimFreeTicketResponse {
  order: OrderView;
  granted: true;
}
