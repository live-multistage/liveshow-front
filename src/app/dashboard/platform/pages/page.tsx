import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { PagesListPage } from '@/features/platform-admin/pages/components/PagesListPage';

export const metadata: Metadata = { title: 'Plataforma — Páginas' };

export default async function Page() {
  await requireFeatureFlag('page_builder');
  return <PagesListPage />;
}
