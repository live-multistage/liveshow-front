'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/cart.types';

interface CartState {
  items: CartItem[];
  // One ticket per event: adding an event already in the cart replaces it.
  addItem: (item: CartItem) => void;
  removeItem: (eventId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((s) => ({
          items: [...s.items.filter((i) => i.eventId !== item.eventId), item],
        })),
      removeItem: (eventId) =>
        set((s) => ({ items: s.items.filter((i) => i.eventId !== eventId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'ls-cart',
      version: 1,
      // Migrate the previous single-item shape ({ item }) to the list shape.
      migrate: (persisted: unknown) => {
        const p = persisted as { item?: CartItem; items?: CartItem[] } | undefined;
        const items = p?.items ?? (p?.item ? [p.item] : []);
        return { items } as Partial<CartState>;
      },
    },
  ),
);
