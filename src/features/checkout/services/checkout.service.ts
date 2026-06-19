import { httpClient } from '@/lib/http/client';
import type {
  CheckoutSession,
  CreateCheckoutSessionRequest,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  PaymentMethod,
  PaymentStatusResponse,
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
};
