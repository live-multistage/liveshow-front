import type { Metadata } from 'next';
import { RoleDashboardOverview } from '@/features/dashboard';

export const metadata: Metadata = { title: 'Painel' };

export default function DashboardPage() {
  return <RoleDashboardOverview />;
}
