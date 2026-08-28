import { httpClient } from '@/lib/http/client';
import type { CartItemView, CartView, CartTotals, CartTotalLine } from '@live-show/api-contracts';

export type { CartItemView, CartView, CartTotals, CartTotalLine };

// Backward compatibility alias
export type CartLineView = CartItemView;

export const cartService = {
  get: async (): Promise<CartView> => (await httpClient.get<CartView>('/cart')).data,
  add: async (ticketProductId: string): Promise<CartView> =>
    (await httpClient.post<CartView>('/cart/items', { ticketProductId })).data,
  remove: async (eventId: string): Promise<CartView> =>
    (await httpClient.delete<CartView>(`/cart/items/${eventId}`)).data,
  clear: async (): Promise<CartView> => (await httpClient.delete<CartView>('/cart')).data,
};
