import type { Metadata } from 'next';
import { CheckoutSuccessContent } from '@/features/checkout';

export const metadata: Metadata = { title: 'Pagamento confirmado' };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessContent />;
}
