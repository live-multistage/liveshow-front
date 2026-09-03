export type PaymentProvider =
  | 'STRIPE'
  | 'PAYPAL'
  | 'MERCADO_PAGO'
  | 'PIX'
  | 'INTERNAL'
  | 'GOOGLE_PLAY';

export type PaymentActionType =
  | 'REDIRECT'
  | 'EMBEDDED_FORM'
  | 'QR_CODE'
  | 'COMPLETED'
  | 'PAYMENT_INTENT'
  | 'PLAY_BILLING';

export type PaymentAction =
  | { type: 'REDIRECT'; url: string }
  | { type: 'EMBEDDED_FORM'; clientSecret: string }
  | { type: 'QR_CODE'; qrCode: string }
  | { type: 'COMPLETED'; externalReference: string }
  // Everything the native Stripe PaymentSheet needs, in one payload.
  | {
      type: 'PAYMENT_INTENT';
      clientSecret: string;
      customerId: string;
      ephemeralKeySecret: string;
      publishableKey: string;
      externalReference: string;
    }
  // Google Play Billing: which consumable to launch, and the id to stamp into
  // obfuscatedAccountIdAndroid so the receipt comes back attributable.
  | { type: 'PLAY_BILLING'; productId: string; externalReference: string };

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

/**
 * What a client may ask POST /orders for. Narrower than PaymentProvider on
 * purpose: PIX, PAYPAL and MERCADO_PAGO exist as historical values on stored
 * payments, but no client may request them.
 */
export type PaymentProviderChoice = 'STRIPE' | 'GOOGLE_PLAY';

// Where a sale was made. Reporting-only: the store commission is absorbed by
// the platform, so the ledger is identical across channels.
export type PaymentChannel = 'WEB' | 'MOBILE_IOS' | 'MOBILE_ANDROID';

export type MobileCheckoutBlockReason = 'FLAG_OFF' | 'COUNTRY' | 'PLATFORM';

export interface MobileCheckoutGate {
  enabled: boolean;
  reason?: MobileCheckoutBlockReason;
}

// GET /payments/methods. The gate verdict travels with the catalog so one
// request answers both "how can they pay" and "may they pay in-app at all".
export interface PaymentMethodsResponse {
  methods: PaymentMethod[];
  mobileCheckout: MobileCheckoutGate;
}

// Mirrors the API's PaymentStatus enum. There is no payment-status endpoint —
// clients poll GET /orders/:id and read the order's status instead.
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

// GET /orders/payment-options. The backend decides both verdicts so the screen
// can never offer a button POST /orders rejects. `play: null` covers every
// reason at once — iOS, the flag off, an unsupported country, or a total that
// is not on the fixed Play price ladder.
export interface PaymentOptionsResponse {
  stripe: boolean;
  play: { productId: string } | null;
}

// POST /payments/google-play/verify. The purchase token is verified against
// Google server-side; the app never decides that a purchase is valid.
export interface VerifyGooglePlayPurchaseRequest {
  paymentId: string;
  purchaseToken: string;
}

export interface VerifyGooglePlayPurchaseResponse {
  orderId: string;
  status: import('../orders/types').OrderStatus;
}
