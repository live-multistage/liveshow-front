import { PublicPreviewPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export default async function OrganizationPublicPage({ params }: Props) {
  const { organizationId } = await params;
  return <PublicPreviewPage organizationId={organizationId} />;
}
