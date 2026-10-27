import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsPageContent } from '@/features/events';

export const metadata: Metadata = { title: 'Eventos' };

// EventsPageContent reads ?status=&page= with useSearchParams; without the
// Suspense boundary the build bails the whole page out to client rendering.
export default function DashboardEventsPage() {
  return (
    <Suspense>
      <EventsPageContent />
    </Suspense>
  );
}
