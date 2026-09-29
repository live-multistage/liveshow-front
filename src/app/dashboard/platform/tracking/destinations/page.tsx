import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingDestinationsPage } from '@/features/tracking-admin/components/TrackingDestinationsPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Destinos' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingDestinationsPage trackingEnabled={flags.tracking} />;
}
