'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/cart.types';

interface CartState {
  item: CartItem | null;
  setItem: (item: CartItem) => void;
  clear: () => void;
}

// Single-item cart: setItem replaces any existing selection.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      item: null,
      setItem: (item) => set({ item }),
      clear: () => set({ item: null }),
    }),
    { name: 'ls-cart' },
  ),
);
