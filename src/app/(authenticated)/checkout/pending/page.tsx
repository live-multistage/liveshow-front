import type { Metadata } from 'next';
import { CheckoutPendingContent } from '@/features/checkout';

interface Props {
  searchParams: Promise<{ orderId?: string }>;
}

export const metadata: Metadata = { title: 'Aguardando pagamento' };

export default async function CheckoutPendingPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  return <CheckoutPendingContent orderId={orderId} />;
}
