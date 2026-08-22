import type { Metadata } from 'next';
import { CheckoutFailedContent } from '@/features/checkout';
import { resolveEventId } from '@/features/events/queries/get-event.server';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string }>;
}

export const metadata: Metadata = { title: 'Pagamento falhou' };

export default async function CheckoutFailedPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const { ticketId } = await searchParams;
  return <CheckoutFailedContent eventId={await resolveEventId(param)} ticketProductId={ticketId} />;
}
