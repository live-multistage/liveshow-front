import { PublicPreviewPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationPublicPage({ params }: Props) {
  const { id } = await params;
  return <PublicPreviewPage organizationId={id} />;
}
