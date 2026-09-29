import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingSourcesPage } from '@/features/tracking-admin/components/TrackingSourcesPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Fontes' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingSourcesPage trackingEnabled={flags.tracking} />;
}
