import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingReportsPage } from '@/features/tracking-admin/components/reports/TrackingReportsPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Explorar' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingReportsPage tab="explore" trackingEnabled={flags.tracking} />;
}
