import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { TemplateEditorPage } from '@/features/platform-admin/mailing';

export const metadata: Metadata = { title: 'Plataforma — Template de e-mail' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireFeatureFlag('mailing');
  const { id } = await params;
  return <TemplateEditorPage templateId={id === 'new' ? null : id} />;
}
