import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';
import { fetchCartServer } from '@/features/cart/services/cart.server';

export const metadata: Metadata = { title: 'Carrinho' };

export default async function CartPage() {
  const initialCart = await fetchCartServer();
  return <CartPageContent initialCart={initialCart} />;
}
