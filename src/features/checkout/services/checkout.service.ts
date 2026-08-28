import { httpClient } from '@/lib/http/client';
import type {
  PaymentMethod,
  PaymentStatusResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketResponse,
  CartCouponPreviewRequest,
  CartCouponPreviewResult,
} from '../types/checkout.types';

export const checkoutService = {
  listPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data } = await httpClient.get<PaymentMethod[]>('/payments/methods');
    return data;
  },

  placeOrder: async (payload: PlaceOrderRequest): Promise<PlaceOrderResponse> => {
    const { data } = await httpClient.post<PlaceOrderResponse>('/orders', payload);
    return data;
  },

  getPaymentStatus: async (paymentId: string): Promise<PaymentStatusResponse> => {
    const { data } = await httpClient.get<PaymentStatusResponse>(`/payments/${paymentId}/status`);
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
};
