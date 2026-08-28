import { httpClient } from '@/lib/http/client';
import type {
  PaymentMethod,
  OrderView,
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
};
