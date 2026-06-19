import type { Metadata } from 'next';
import { CheckoutSuccessContent } from '@/features/checkout';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Pagamento confirmado' };

export default async function CheckoutSuccessPage({ params }: Props) {
  const { id } = await params;
  return <CheckoutSuccessContent eventId={id} />;
}
