import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { UserRoleSearchPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Usuários & Papéis' };

export default async function PlatformUsersPage() {
  const flags = await fetchFeatureFlags();
  return <UserRoleSearchPage trackingEnabled={flags.tracking} />;
}
