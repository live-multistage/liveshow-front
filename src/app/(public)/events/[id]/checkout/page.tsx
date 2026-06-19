import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string; qty?: string }>;
}

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ticketId = '', qty = '1' } = await searchParams;

  return (
    <CheckoutPageContent
      eventId={id}
      ticketProductId={ticketId}
      quantity={Math.max(1, parseInt(qty, 10) || 1)}
    />
  );
}
