import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';
import { resolveEventId } from '@/features/events/queries/get-event.server';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string; qty?: string }>;
}

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { id: param } = await params;
  const { ticketId = '', qty = '1' } = await searchParams;
  // The parent segment accepts a slug; everything below keys off the UUID.
  const id = await resolveEventId(param);

  return (
    <CheckoutPageContent
      eventId={id}
      ticketProductId={ticketId}
      quantity={Math.max(1, parseInt(qty, 10) || 1)}
    />
  );
}
