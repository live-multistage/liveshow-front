import { cookies } from 'next/headers';
import type { CartItem } from '../types/cart.types';

// Server-side read of the cart cookie (written by the zustand persist cookie
// storage). Lets the cart page SSR the items so there is no client-hydration
// layout shift. The cookie holds the persist envelope `{ state: { items }, version }`.
export async function readCartItems(): Promise<CartItem[]> {
  const raw = (await cookies()).get('ls-cart')?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      state?: { items?: CartItem[]; item?: CartItem };
    };
    const items = parsed.state?.items ?? (parsed.state?.item ? [parsed.state.item] : []);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
