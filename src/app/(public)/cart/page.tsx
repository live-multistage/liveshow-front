import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';
import { readCartItems } from '@/features/cart/utils/read-cart.server';

export const metadata: Metadata = { title: 'Carrinho' };

export default async function CartPage() {
  const initialItems = await readCartItems();
  return <CartPageContent initialItems={initialItems} />;
}
