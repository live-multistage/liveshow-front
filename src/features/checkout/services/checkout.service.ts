import { httpClient } from '@/lib/http/client';
import type {
  CheckoutSession,
  CreateCheckoutSessionRequest,
  CartCheckoutResult,
  CouponPreviewRequest,
  CouponPreviewResult,
  CartCouponPreviewRequest,
  CartCouponPreviewResult,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentMethod,
  PaymentStatusResponse,
  PaymentProvider,
  ClaimFreeTicketResult,
} from '../types/checkout.types';

export const checkoutService = {
  listPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await httpClient.get<PaymentMethod[]>('/payments/methods');
    return data;
  },

  createSession: async (payload: CreateCheckoutSessionRequest): Promise<CheckoutSession> => {
    const { data } = await httpClient.post<CheckoutSession>('/payments/sessions', payload);
    return data;
  },

  processPayment: async (payload: ProcessPaymentRequest): Promise<ProcessPaymentResult> => {
    const { data } = await httpClient.post<ProcessPaymentResult>(
      `/payments/sessions/${payload.sessionId}/process`,
      { provider: payload.provider, currency: payload.currency },
    );
    return data;
  },

  getPaymentStatus: async (paymentId: string): Promise<PaymentStatusResponse> => {
    const { data } = await httpClient.get<PaymentStatusResponse>(`/payments/${paymentId}/status`);
    return data;
  },

  previewCoupon: async (payload: CouponPreviewRequest): Promise<CouponPreviewResult> => {
    const { data } = await httpClient.post<CouponPreviewResult>('/coupons/preview', payload);
    return data;
  },

  previewCartCoupon: async (payload: CartCouponPreviewRequest): Promise<CartCouponPreviewResult> => {
    const { data } = await httpClient.post<CartCouponPreviewResult>('/coupons/preview-cart', payload);
    return data;
  },

  createCartSession: async (payload: {
    items: { ticketProductId: string; eventId: string }[];
    provider: PaymentProvider;
    currency?: string;
    couponCode?: string;
  }): Promise<CartCheckoutResult> => {
    const { data } = await httpClient.post<CartCheckoutResult>('/payments/cart-session', payload);
    return data;
  },

  claimFreeTicket: async (eventId: string): Promise<ClaimFreeTicketResult> => {
    const { data } = await httpClient.post<ClaimFreeTicketResult>('/orders/free-ticket', { eventId });
    return data;
  },
};
