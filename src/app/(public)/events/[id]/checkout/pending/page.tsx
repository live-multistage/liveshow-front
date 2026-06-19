import type { Metadata } from 'next';
import { CheckoutPendingContent } from '@/features/checkout';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paymentId?: string }>;
}

export const metadata: Metadata = { title: 'Aguardando pagamento' };

export default async function CheckoutPendingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { paymentId } = await searchParams;
  return <CheckoutPendingContent eventId={id} paymentId={paymentId} />;
}
