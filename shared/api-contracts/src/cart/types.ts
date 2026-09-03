import type { AccessCapability } from '../common/access-capability';

export interface CartItemView {
  eventId: string;
  eventTitle: string;
  eventImage: string | null;
  ticketProductId: string;
  ticketName: string;
  price: number;
  currency?: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  organizationId: string;
  organizationName: string;
}

export interface CartTotalLine {
  key: string;
  label: string;
  amount: number;
}

export interface CartTotals {
  subtotal: number;
  lines: CartTotalLine[];
  total: number;
}

export interface CartView {
  items: CartItemView[];
  totals: CartTotals;
}

export type CartErrorCode = 'CART_CURRENCY_MISMATCH' | 'CART_FULL' | 'EVENT_NOT_PURCHASABLE';

// POST /coupons/preview-cart. The cart is read server-side — `items` is
// accepted by the API for backward compatibility but ignored, so it is not
// part of this contract.
export interface CartCouponPreviewRequest {
  code: string;
}

export interface CartCouponPreviewResult {
  couponId: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  // Reais, not cents — this endpoint's contract differs from /orders.
  discountAmount: number;
  discountValue: number;
  orgIds: string[];
  eventId: string | null;
  eligibleEventIds: string[];
}
