import type { Metadata } from 'next';
import { CheckoutPendingContent } from '@/features/checkout';

interface Props {
  searchParams: Promise<{ orderId?: string; method?: string }>;
}

export const metadata: Metadata = { title: 'Aguardando pagamento' };

export default async function CheckoutPendingPage({ searchParams }: Props) {
  const { orderId, method } = await searchParams;
  return <CheckoutPendingContent orderId={orderId} method={method} />;
}
