import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SHOWS } from '@/features/events/types/show';
import { LivePlayer } from '@/features/streaming/components/LivePlayer';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Assistir' };

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const show = SHOWS.find((s) => s.id === id);

  if (!show) notFound();

  return <LivePlayer show={show} />;
}
