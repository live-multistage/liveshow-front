import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { BlueprintDetailPage } from '@/features/platform-admin/blueprints';

export const metadata: Metadata = { title: 'Plataforma — Blueprint' };

// Not flag-gated (spec D10): see ../page.tsx.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flags = await fetchFeatureFlags();
  return <BlueprintDetailPage id={id} blueprintsEnabled={flags.blueprints} />;
}
