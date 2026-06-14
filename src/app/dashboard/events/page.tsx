import type { Metadata } from 'next';
import { EventsPageContent } from '@/features/events';

export const metadata: Metadata = { title: 'Eventos' };

export default function DashboardEventsPage() {
  return <EventsPageContent />;
}
