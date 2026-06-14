import type { Metadata } from 'next';
import { SettingsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Configurações da organização' };

export default async function OrganizationSettingsPage({ params }: Props) {
  const { id } = await params;
  return <SettingsPage organizationId={id} />;
}
