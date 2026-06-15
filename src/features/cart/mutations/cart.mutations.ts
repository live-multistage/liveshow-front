'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService, type CartView } from '../services/cart.service';
import { CART_KEY } from '../queries/cart.queries';
import { normalizeError } from '@/lib/http/errors';

// Each mutation returns the fresh CartView from the server and writes it straight
// into the cart query cache, so the UI updates in one round-trip.
function useCartMutation<T>(fn: (arg: T) => Promise<CartView>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arg: T) => {
      try {
        return await fn(arg);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: (data) => qc.setQueryData(CART_KEY, data),
  });
}

export const useAddToCartMutation = () => useCartMutation((id: string) => cartService.add(id));
export const useRemoveFromCartMutation = () => useCartMutation((eventId: string) => cartService.remove(eventId));
export const useClearCartMutation = () => useCartMutation((_: void) => cartService.clear());
