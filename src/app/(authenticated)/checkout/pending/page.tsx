import type { Metadata } from 'next';
import { CheckoutPendingContent } from '@/features/checkout';

interface Props {
  searchParams: Promise<{ paymentId?: string }>;
}

export const metadata: Metadata = { title: 'Aguardando pagamento' };

export default async function CheckoutPendingPage({ searchParams }: Props) {
  const { paymentId } = await searchParams;
  return <CheckoutPendingContent paymentId={paymentId} />;
}
