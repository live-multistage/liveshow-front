import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventCached } from '@/features/events/queries/get-event.server';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { LiveGate } from '@/features/streaming/components/LiveGate';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Assistir' };

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  try {
    const [event, flags] = await Promise.all([getEventCached(id), fetchFeatureFlags()]);
    return <LiveGate eventId={id} eventTitle={event.title} chatEnabled={flags.chat} />;
  } catch {
    notFound();
  }
}
