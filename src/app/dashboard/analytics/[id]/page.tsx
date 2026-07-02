import type { Metadata } from 'next';
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Análises do Evento' };

export default async function EventAnalyticsPage({ params }: Props) {
  const { id } = await params;
  return <AnalyticsDashboard eventId={id} />;
}
