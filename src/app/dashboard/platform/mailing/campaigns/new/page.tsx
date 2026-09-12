import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { CampaignWizard } from '@/features/platform-admin/mailing';

export const metadata: Metadata = { title: 'Plataforma — Nova campanha' };

export default async function Page({ searchParams }: { searchParams: Promise<{ templateId?: string }> }) {
  await requireFeatureFlag('mailing');
  const { templateId } = await searchParams;
  return <CampaignWizard initialTemplateId={templateId} />;
}
