import type { Metadata } from 'next';
import { StreamsPageContent } from '@/features/streams';

export const metadata: Metadata = { title: 'Transmissões' };

export default function DashboardStreamsPage() {
  return <StreamsPageContent />;
}
