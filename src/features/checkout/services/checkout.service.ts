import { httpClient } from '@/lib/http/client';
import type {
  PaymentMethod,
  PaymentMethodsResponse,
  PaymentOptionsResponse,
  PixQrAction,
  OrderView,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketResponse,
  CartCouponPreviewRequest,
  CartCouponPreviewResult,
} from '../types/checkout.types';

export const checkoutService = {
  listPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await httpClient.get<PaymentMethodsResponse>('/payments/methods');
    return data.methods;
  },

  // The key is what stops a second click / browser back / second tab from
  // opening a second Stripe session for the same cart — see
  // ../utils/idempotency-key.
  placeOrder: async (
    payload: PlaceOrderRequest,
    idempotencyKey: string,
  ): Promise<PlaceOrderResponse> => {
    const { data } = await httpClient.post<PlaceOrderResponse>('/orders', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },

  getOrder: async (orderId: string): Promise<OrderView> => {
    const { data } = await httpClient.get<OrderView>(`/orders/${orderId}`);
    return data;
  },

  previewCartCoupon: async (payload: CartCouponPreviewRequest): Promise<CartCouponPreviewResult> => {
    const { data } = await httpClient.post<CartCouponPreviewResult>('/coupons/preview-cart', payload);
    return data;
  },

  claimFreeTicket: async (ticketProductId: string): Promise<ClaimFreeTicketResponse> => {
    const { data } = await httpClient.post<ClaimFreeTicketResponse>('/orders/free-ticket', { ticketProductId });
    return data;
  },

  getPaymentOptions: async (): Promise<PaymentOptionsResponse> => {
    const { data } = await httpClient.get<PaymentOptionsResponse>('/orders/payment-options');
    return data;
  },

  getPaymentAction: async (orderId: string): Promise<PixQrAction> => {
    const { data } = await httpClient.get<PixQrAction>(`/orders/${orderId}/payment-action`);
    return data;
  },
};
