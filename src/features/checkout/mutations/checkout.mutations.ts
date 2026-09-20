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
    mutationFn: ({ payload, idempotencyKey }: { payload: PlaceOrderRequest; idempotencyKey: string }) =>
      checkoutService.placeOrder(payload, idempotencyKey),
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

export function usePaymentOptionsQuery() {
  return useQuery({
    queryKey: ['orders', 'payment-options'],
    queryFn: checkoutService.getPaymentOptions,
    // Eligibility depends on the cart; refetch when the checkout mounts.
    staleTime: 0,
  });
}

export const pixActionKey = (orderId: string | null) => ['orders', orderId, 'payment-action'] as const;

// Seeded by the checkout right after POST /orders; fetched only after a reload.
export function usePixPaymentAction(orderId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: pixActionKey(orderId),
    queryFn: () => checkoutService.getPaymentAction(orderId!),
    enabled: !!orderId && enabled,
    staleTime: Infinity,
    retry: false,
  });
}
