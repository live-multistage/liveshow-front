import type { Metadata } from 'next';
import { CartCheckoutPageContent } from '@/features/checkout';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
  const flags = await fetchFeatureFlags();
  return <CartCheckoutPageContent couponsEnabled={flags.coupons} />;
}
