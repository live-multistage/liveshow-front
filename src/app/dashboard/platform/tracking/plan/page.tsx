import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingPlanPage } from '@/features/tracking-admin/components/TrackingPlanPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Plano de eventos' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingPlanPage trackingEnabled={flags.tracking} />;
}
