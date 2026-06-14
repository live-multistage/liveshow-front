import type { Metadata } from 'next';
import { OrganizationDashboardPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export const metadata: Metadata = { title: 'Organização' };

export default async function OrganizationOverviewPage({ params }: Props) {
  const { organizationId } = await params;
  return <OrganizationDashboardPage organizationId={organizationId} />;
}
