import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SHOWS } from '@/features/events/types/show';
import { LivePlayer } from '@/features/streaming/components/LivePlayer';

interface Props {
  params: Promise<{ eventId: string }>;
}

export const metadata: Metadata = { title: 'Ao vivo' };

export default async function LivePage({ params }: Props) {
  const { eventId } = await params;
  const show = SHOWS.find((s) => s.id === eventId);

  if (!show) notFound();

  return <LivePlayer show={show} />;
}
