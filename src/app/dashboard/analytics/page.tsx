import type { Metadata } from 'next';
import { AnalyticsListPage } from '@/features/analytics/components/AnalyticsListPage';

export const metadata: Metadata = { title: 'Análises' };

export default function DashboardAnalyticsPage() {
  return <AnalyticsListPage />;
}
