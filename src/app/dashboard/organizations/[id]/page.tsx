import { OrgDetailLoader } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  return <OrgDetailLoader orgId={id} />;
}
