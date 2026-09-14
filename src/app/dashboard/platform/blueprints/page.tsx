import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { BlueprintsPage } from '@/features/platform-admin/blueprints';

export const metadata: Metadata = { title: 'Plataforma — Blueprints' };

// Not flag-gated (spec D10): the `blueprints` flag only stops runs; admins
// author and publish while it is OFF. SUPER_ADMIN via the platform layout guard.
export default async function Page() {
  const flags = await fetchFeatureFlags();
  return <BlueprintsPage blueprintsEnabled={flags.blueprints} />;
}
