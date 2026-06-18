'use client';
import { useCartQuery } from '../queries/cart.queries';

export function useCartCount(): number {
  const { data } = useCartQuery();
  return data?.items?.length ?? 0;
}
