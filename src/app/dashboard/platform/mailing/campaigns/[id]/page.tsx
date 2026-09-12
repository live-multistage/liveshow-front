import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { CampaignDetailPage } from '@/features/platform-admin/mailing';

export const metadata: Metadata = { title: 'Plataforma — Campanha' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireFeatureFlag('mailing');
  const { id } = await params;
  return <CampaignDetailPage campaignId={id} />;
}
