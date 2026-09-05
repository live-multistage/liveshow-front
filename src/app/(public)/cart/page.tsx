import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';
import { fetchCartServer } from '@/features/cart/services/cart.server';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Carrinho' };

export default async function CartPage() {
  const [initialCart, flags] = await Promise.all([fetchCartServer(), fetchFeatureFlags()]);
  return <CartPageContent initialCart={initialCart} couponsEnabled={flags.coupons} />;
}
