import type { Metadata } from 'next';
import { CheckoutSuccessContent } from '@/features/checkout';
import { resolveEventId } from '@/features/events/queries/get-event.server';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Pagamento confirmado' };

export default async function CheckoutSuccessPage({ params }: Props) {
  const { id: param } = await params;
  return <CheckoutSuccessContent eventId={await resolveEventId(param)} />;
}
