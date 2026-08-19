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
  return <EventDashboardDetailContent id={id} vodUploadEnabled={flags.vod_upload} />;
}
