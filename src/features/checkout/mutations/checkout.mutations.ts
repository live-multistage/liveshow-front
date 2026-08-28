import { useMutation, useQuery } from '@tanstack/react-query';
import { checkoutService } from '../services/checkout.service';
import type { PlaceOrderRequest } from '../types/checkout.types';

export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: checkoutService.listPaymentMethods,
    staleTime: Infinity,
  });
}

export function usePlaceOrderMutation() {
  return useMutation({
    mutationFn: (payload: PlaceOrderRequest) => checkoutService.placeOrder(payload),
  });
}

export function usePaymentStatusQuery(paymentId: string | null, enabled = false) {
  return useQuery({
    queryKey: ['checkout', 'payment-status', paymentId],
    queryFn: () => checkoutService.getPaymentStatus(paymentId!),
    enabled: !!paymentId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'REFUNDED') return false;
      return 3000;
    },
  });
}
