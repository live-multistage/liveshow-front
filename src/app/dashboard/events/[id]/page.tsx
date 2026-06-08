import { EventDashboardDetailContent } from '@/features/events/components/dashboard/EventDashboardDetailContent';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventDetailPage({ params }: Props) {
  const { id } = await params;
  return <EventDashboardDetailContent id={id} />;
}
