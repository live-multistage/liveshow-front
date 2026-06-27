import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventCached } from '@/features/events/queries/get-event.server';
import { LiveGate } from '@/features/streaming/components/LiveGate';

interface Props {
  params: Promise<{ eventId: string }>;
}

export const metadata: Metadata = { title: 'Ao vivo' };

export default async function LivePage({ params }: Props) {
  const { eventId } = await params;
  
  return <LiveGate eventId={eventId} />;
}
