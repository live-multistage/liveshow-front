import type { Metadata } from 'next';
import { CartCheckoutPageContent } from '@/features/checkout';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return <CartCheckoutPageContent />;
}
