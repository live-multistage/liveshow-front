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

// The order, not the payment, is what the buyer is waiting on — the webhook
// writes the order first, so polling it never reports success too early.
export function useOrderQuery(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => checkoutService.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== 'PENDING' ? false : 3000,
  });
}
