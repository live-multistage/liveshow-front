import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { BlueprintsPage } from '@/features/platform-admin/blueprints';

export const metadata: Metadata = { title: 'Plataforma — Blueprints' };

export default async function Page() {
  await requireFeatureFlag('blueprints');
  return <BlueprintsPage />;
}
