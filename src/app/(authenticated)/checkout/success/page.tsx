import type { Metadata } from 'next';
import { CheckoutSuccessContent } from '@/features/checkout';

export const metadata: Metadata = { title: 'Confirmação do pedido' };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessContent />;
}
