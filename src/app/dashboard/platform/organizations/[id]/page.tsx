import type { Metadata } from 'next';
import { OrganizationDetailPage } from '@/features/platform-admin';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Plataforma — Detalhe da Organização' };

export default async function PlatformOrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrganizationDetailPage organizationId={id} />;
}
