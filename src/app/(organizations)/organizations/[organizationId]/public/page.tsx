import type { Metadata } from 'next';
import { PublicPreviewPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export const metadata: Metadata = { title: 'Prévia pública' };

export default async function OrganizationPublicPage({ params }: Props) {
  const { organizationId } = await params;
  return <PublicPreviewPage organizationId={organizationId} />;
}
