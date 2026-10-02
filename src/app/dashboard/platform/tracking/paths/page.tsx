import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingReportsPage } from '@/features/tracking-admin/components/reports/TrackingReportsPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Caminhos' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingReportsPage tab="paths" trackingEnabled={flags.tracking} />;
}
