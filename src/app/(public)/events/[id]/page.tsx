import type { Metadata } from 'next';
import { EventDetailPageContent } from '@/features/events';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Evento' };

export default async function ShowDetail({ params }: Props) {
  const { id } = await params;
  return <EventDetailPageContent id={id} />;
}
