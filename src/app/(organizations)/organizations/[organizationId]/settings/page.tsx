import type { Metadata } from 'next';
import { SettingsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export const metadata: Metadata = { title: 'Configurações da organização' };

export default async function OrganizationSettingsPage({ params }: Props) {
  const { organizationId } = await params;
  return <SettingsPage organizationId={organizationId} />;
}
