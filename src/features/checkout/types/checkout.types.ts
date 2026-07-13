export interface CheckoutSession {
  sessionId: string;
  orderId: string;
  expiresAt: string;
  totalAmount: number;
  discountAmount: number;
  currency: string;
  ticketProductName: string;
}

export type PaymentProvider =
  | 'STRIPE'
  | 'PAYPAL'
  | 'MERCADO_PAGO'
  | 'PIX'
  | 'INTERNAL';

export type PaymentActionType =
  | 'REDIRECT'
  | 'EMBEDDED_FORM'
  | 'QR_CODE'
  | 'COMPLETED';

export type PaymentAction =
  | { type: 'REDIRECT'; url: string }
  | { type: 'EMBEDDED_FORM'; clientSecret: string }
  | { type: 'QR_CODE'; qrCode: string }
  | { type: 'COMPLETED'; externalReference: string };

export interface ProcessPaymentResult {
  paymentId: string;
  action: PaymentAction;
}

export type PaymentMethodType =
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'GOOGLE_PAY'
  | 'APPLE_PAY'
  | 'STRIPE';

export interface PaymentMethod {
  id: string;
  displayName: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
}

export interface CreateCheckoutSessionRequest {
  ticketProductId: string;
  couponCode?: string;
  currency?: string;
}

export interface CouponPreviewRequest {
  code: string;
  eventId: string;
  orderAmount: number;
}

export interface CartCheckoutResult {
  url: string;
  totalAmount: number;
  orderIds: string[];
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
  currency?: string;
}

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export interface PaymentStatusResponse {
  paymentId: string;
  status: PaymentStatus;
}

export interface ClaimFreeTicketResult {
  granted: boolean;
}
