import { useEffect, useState } from 'react';
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

export const ORDER_POLL_INTERVAL_MS = 3000;
// A tab left open on a PENDING order must not poll forever; past this window
// the screen tells the buyer to come back later instead.
export const ORDER_POLL_WINDOW_MS = 15 * 60_000;

// The order, not the payment, is what the buyer is waiting on — the webhook
// writes the order first, so polling it never reports success too early.
export function useOrderQuery(orderId: string | null) {
  const [pollingExpired, setPollingExpired] = useState(false);

  useEffect(() => {
    setPollingExpired(false);
    const timer = setTimeout(() => setPollingExpired(true), ORDER_POLL_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [orderId]);

  const query = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => checkoutService.getOrder(orderId!),
    enabled: !!orderId,
    refetchInterval: (q) =>
      pollingExpired || (q.state.data && q.state.data.status !== 'PENDING') ? false : ORDER_POLL_INTERVAL_MS,
  });

  return { ...query, pollingExpired };
}
