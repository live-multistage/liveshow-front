'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/account/hooks/use-auth';
import { cartService, type CartView } from '../services/cart.service';

export const CART_KEY = ['cart'] as const;

// Server cart. `initialData` is the SSR-fetched cart so the first paint matches
// the server render (no layout shift). User-scoped: gate on auth being hydrated
// + logged in, else the fetch races the token on a fresh load and 401s (see
// get-wishlist.ts). initialData still paints while the query stays disabled.
export function useCartQuery(initialData?: CartView) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: CART_KEY,
    queryFn: cartService.get,
    initialData,
    enabled: !isLoading && isLoggedIn,
  });
}
