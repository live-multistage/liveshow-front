import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { PageEditorPage } from '@/features/platform-admin/pages/components/PageEditorPage';

export const metadata: Metadata = { title: 'Plataforma — Editor de página' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const flags = await requireFeatureFlag('page_builder');
  const { id } = await params;
  return <PageEditorPage pageId={id} v2={flags.page_builder_v2 === true} />;
}
