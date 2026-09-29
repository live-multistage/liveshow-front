import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { TrackingUserProfilePage } from '@/features/tracking-admin/components/user/TrackingUserProfilePage';

export const metadata: Metadata = { title: 'Plataforma — Tracking · Usuário' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flags = await fetchFeatureFlags();
  return <TrackingUserProfilePage userId={id} trackingEnabled={flags.tracking} />;
}
