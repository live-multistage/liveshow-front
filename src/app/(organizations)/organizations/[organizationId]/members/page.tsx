import { MembersPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export default async function OrganizationMembersPage({ params }: Props) {
  const { organizationId } = await params;
  return <MembersPage organizationId={organizationId} />;
}
