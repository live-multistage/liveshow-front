import type { Metadata } from 'next';
import { CheckoutFailedContent } from '@/features/checkout';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticketId?: string }>;
}

export const metadata: Metadata = { title: 'Pagamento falhou' };

export default async function CheckoutFailedPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ticketId } = await searchParams;
  return <CheckoutFailedContent eventId={id} ticketProductId={ticketId} />;
}
