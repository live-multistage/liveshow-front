import type {
  PaymentProvider,
  PaymentActionType,
  PaymentAction,
  PaymentMethod,
  PaymentMethodType,
  PaymentStatusResponse,
  PaymentStatus,
  OrderView,
  OrderLineView,
  OrderLineEventView,
  OrderStatus,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketRequest,
  ClaimFreeTicketResponse,
} from '@live-show/api-contracts';

export type {
  PaymentProvider,
  PaymentActionType,
  PaymentAction,
  PaymentMethod,
  PaymentMethodType,
  PaymentStatusResponse,
  PaymentStatus,
  OrderView,
  OrderLineView,
  OrderLineEventView,
  OrderStatus,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketRequest,
  ClaimFreeTicketResponse,
};

export interface CheckoutSession {
  sessionId: string;
  orderId: string;
  expiresAt: string;
  totalAmount: number;
  discountAmount: number;
  currency: string;
  ticketProductName: string;
}

export interface ProcessPaymentResult {
  paymentId: string;
  action: PaymentAction;
}

export interface CreateCheckoutSessionRequest {
  ticketProductId: string;
  couponCode?: string;
}

export interface CouponPreviewRequest {
  code: string;
  eventId: string;
  orderAmount: number;
}

// One Stripe session per currency group in the cart. Named `CartCheckoutSession`
// (not `CheckoutSession`) because that name is already taken by the single
// ticket-product checkout session above — different shape, different endpoint.
export interface CartCheckoutSession {
  url: string;
  currency: string;
  amount: number;
  orderIds: string[];
}

export interface CartCheckoutResult {
  sessions: CartCheckoutSession[];
}

export interface CouponPreviewResult {
  couponId: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  orgIds: string[];
  eventId: string | null;
}

export interface CartCouponPreviewRequest {
  code: string;
  items: { eventId: string; amount: number }[];
}

export interface CartCouponPreviewResult {
  couponId: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  orgIds: string[];
  eventId: string | null;
  eligibleEventIds: string[];
}

export interface ProcessPaymentRequest {
  sessionId: string;
  provider: PaymentProvider;
}

export interface ClaimFreeTicketResult {
  granted: boolean;
}
