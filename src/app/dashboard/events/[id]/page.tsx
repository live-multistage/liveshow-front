import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EventDashboardDetailContent } from '@/features/events/components/dashboard/EventDashboardDetailContent';
import { getEventCached } from '@/features/events/queries/get-event.server';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEventCached(id);
    return { title: event.title };
  } catch {
    return { title: 'Evento' };
  }
}

export default async function DashboardEventDetailPage({ params }: Props) {
  const { id } = await params;

  let event;
  try {
    event = await getEventCached(id);
  } catch {
    notFound();
  }

  return <EventDashboardDetailContent id={id} initialEvent={event} />;
}
