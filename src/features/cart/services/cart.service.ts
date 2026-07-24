import { httpClient } from '@/lib/http/client';
import type { AccessCapability } from '@/features/events';

export interface CartLineView {
  eventId: string;
  eventTitle: string;
  eventImage: string | null;
  ticketProductId: string;
  ticketName: string;
  price: number;
  // ponytail: backend cart DTO doesn't send currency yet (see
  // live-show-orchestrator src/cart/application/dto/cart-view.dto.ts) —
  // optional here so old/current API responses don't break the type; every
  // read site falls back to 'BRL'. Drop the fallback once the backend adds it.
  currency?: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  organizationId: string;
  organizationName: string;
}

export interface CartTotalLine {
  key: string;
  label: string;
  amount: number;
}

export interface CartTotals {
  subtotal: number;
  lines: CartTotalLine[];
  total: number;
}

export interface CartView {
  items: CartLineView[];
  totals: CartTotals;
}

export const cartService = {
  get: async (): Promise<CartView> => (await httpClient.get<CartView>('/cart')).data,
  add: async (ticketProductId: string): Promise<CartView> =>
    (await httpClient.post<CartView>('/cart/items', { ticketProductId })).data,
  remove: async (eventId: string): Promise<CartView> =>
    (await httpClient.delete<CartView>(`/cart/items/${eventId}`)).data,
  clear: async (): Promise<CartView> => (await httpClient.delete<CartView>('/cart')).data,
};
