import type { Metadata } from 'next';
import { CheckoutPendingContent } from '@/features/checkout';
import { resolveEventId } from '@/features/events/queries/get-event.server';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paymentId?: string }>;
}

export const metadata: Metadata = { title: 'Aguardando pagamento' };

export default async function CheckoutPendingPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const { paymentId } = await searchParams;
  return <CheckoutPendingContent eventId={await resolveEventId(param)} paymentId={paymentId} />;
}
