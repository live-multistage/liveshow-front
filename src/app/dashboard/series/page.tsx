import type { Metadata } from 'next';
import { SeriesPageContent } from '@/features/series/components/dashboard/SeriesPageContent';

export const metadata: Metadata = { title: 'Séries' };

export default function DashboardSeriesPage() {
  return <SeriesPageContent />;
}
