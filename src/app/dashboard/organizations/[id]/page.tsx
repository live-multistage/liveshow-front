import type { Metadata } from 'next';
import { OrganizationDashboardPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Organização' };

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrganizationDashboardPage organizationId={id} />;
}
