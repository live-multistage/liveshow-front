import type { Metadata } from 'next';
import { UnsubscribeContent } from '@/features/account';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export const metadata: Metadata = {
  title: 'Cancelar inscrição',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  return <UnsubscribeContent token={token} />;
}
