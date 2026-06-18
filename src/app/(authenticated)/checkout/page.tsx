import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
