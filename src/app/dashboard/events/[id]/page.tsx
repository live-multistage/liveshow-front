import type { Metadata } from 'next';
import { EventDashboardDetailContent } from '@/features/events/components/dashboard/EventDashboardDetailContent';
import { fetchFeatureFlags } from '@/features/feature-flags';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Evento' };

export default async function DashboardEventDetailPage({ params }: Props) {
  const { id } = await params;
  const flags = await fetchFeatureFlags();
  // physical_tickets and event_collaborations are per-org beta flags with no
  // member-readable org endpoint yet (TODO in get-feature-flags.server.ts) —
  // fail open here instead of hiding a feature that may be on via an org
  // override the frontend can't see.
  return (
    <EventDashboardDetailContent
      id={id}
      vodUploadEnabled={flags.vod_upload}
      lowLatencyEnabled={flags.low_latency_mode}
      physicalTicketsEnabled
      collaborationsEnabled
    />
  );
}
