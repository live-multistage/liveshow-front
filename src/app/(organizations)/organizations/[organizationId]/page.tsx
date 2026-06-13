import { OrganizationDashboardPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export default async function OrganizationOverviewPage({ params }: Props) {
  const { organizationId } = await params;
  return <OrganizationDashboardPage organizationId={organizationId} />;
}
