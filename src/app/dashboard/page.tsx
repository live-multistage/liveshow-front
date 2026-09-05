import type { Metadata } from 'next';
import { RoleDashboardOverview } from '@/features/dashboard';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Painel' };

export default async function DashboardPage() {
  const flags = await fetchFeatureFlags();
  return <RoleDashboardOverview revenueShareEnabled={flags.ad_revenue_share} />;
}
