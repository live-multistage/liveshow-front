import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { BlueprintDetailPage } from '@/features/platform-admin/blueprints';

export const metadata: Metadata = { title: 'Plataforma — Blueprint' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireFeatureFlag('blueprints');
  const { id } = await params;
  return <BlueprintDetailPage id={id} />;
}
