import type { Metadata } from 'next';
import { OrganizationPublicPage } from '@/features/organizations';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: 'Organização' };

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  return <OrganizationPublicPage slug={slug} />;
}
