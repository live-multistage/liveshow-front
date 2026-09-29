import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingOverviewPage } from '@/features/tracking-admin/components/TrackingOverviewPage';

export const metadata: Metadata = { title: 'Plataforma — Tracking' };

// Not flag-gated with requireFeatureFlag/notFound (design A2): with `tracking`
// OFF the page still renders (historical data + a warning banner), it just
// stops accepting new events server-side.
export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <TrackingOverviewPage trackingEnabled={flags.tracking} />;
}
