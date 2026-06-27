import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventCached } from '@/features/events/queries/get-event.server';
import { ReplayGate } from '@/features/streaming/components/ReplayGate';

interface Props {
  params: Promise<{ eventId: string }>;
}

export const metadata: Metadata = { title: 'Replay' };

export default async function ReplayPage({ params }: Props) {
  const { eventId } = await params;
  try {
    const event = await getEventCached(eventId);
    return <ReplayGate eventId={eventId} eventTitle={event.title} />;
  } catch {
    notFound();
  }
}
