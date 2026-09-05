import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventCached } from '@/features/events/queries/get-event.server';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { ReplayGate } from '@/features/streaming/components/ReplayGate';

interface Props {
  params: Promise<{ eventId: string }>;
}

export const metadata: Metadata = { title: 'Replay' };

export default async function ReplayPage({ params }: Props) {
  const { eventId } = await params;
  try {
    const [event, flags] = await Promise.all([getEventCached(eventId), fetchFeatureFlags()]);
    return (
      <ReplayGate
        eventId={eventId}
        eventTitle={event.title}
        coverUrl={event.thumbnailUrl ?? event.bannerUrl}
        adsEnabled={flags.ads_delivery}
      />
    );
  } catch {
    notFound();
  }
}
