'use client';

import { useQuery } from '@tanstack/react-query';
import { cartService, type CartView } from '../services/cart.service';

export const CART_KEY = ['cart'] as const;

// Server cart. `initialData` is the SSR-fetched cart so the first paint matches
// the server render (no layout shift).
export function useCartQuery(initialData?: CartView) {
  return useQuery({ queryKey: CART_KEY, queryFn: cartService.get, initialData });
}
