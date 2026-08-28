import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';

interface Props {
  searchParams: Promise<{ ticketId?: string }>;
}

export const metadata: Metadata = { title: 'Checkout' };

export default async function CheckoutPage({ searchParams }: Props) {
  const { ticketId = '' } = await searchParams;

  return <CheckoutPageContent ticketProductId={ticketId} />;
}
