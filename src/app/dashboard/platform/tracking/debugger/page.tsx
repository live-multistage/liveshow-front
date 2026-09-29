import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingDebuggerPage } from '@/features/tracking-admin/components/TrackingDebuggerPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Depurador' };

export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingDebuggerPage trackingEnabled={flags.tracking} />;
}
