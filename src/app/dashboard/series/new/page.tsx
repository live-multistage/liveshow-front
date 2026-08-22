import type { Metadata } from 'next';
import { SeriesForm } from '@/features/series/components/dashboard/SeriesForm';

export const metadata: Metadata = { title: 'Nova série' };

export default function CreateSeriesPage() {
  return <SeriesForm />;
}
