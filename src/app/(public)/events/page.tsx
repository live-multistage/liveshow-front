import type { Metadata } from 'next';
import { EventsListPageContent } from '@/features/events';

export const metadata: Metadata = { title: 'Shows' };

export default function Shows() {
  return <EventsListPageContent />;
}
