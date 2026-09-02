import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StreamsPageContent } from '@/features/streams';

export const metadata: Metadata = { title: 'Transmissões' };

// StreamsPageContent lê `?eventId=` com useSearchParams — sem o Suspense o
// build reclama do bailout de CSR na página inteira.
export default function DashboardStreamsPage() {
  return (
    <Suspense>
      <StreamsPageContent />
    </Suspense>
  );
}
