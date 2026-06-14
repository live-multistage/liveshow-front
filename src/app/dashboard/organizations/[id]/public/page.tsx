import type { Metadata } from 'next';
import { PublicPreviewPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Prévia pública' };

export default async function OrganizationPublicPage({ params }: Props) {
  const { id } = await params;
  return <PublicPreviewPage organizationId={id} />;
}
