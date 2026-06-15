import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';

export const metadata: Metadata = { title: 'Carrinho' };

export default function CartPage() {
  return <CartPageContent />;
}
