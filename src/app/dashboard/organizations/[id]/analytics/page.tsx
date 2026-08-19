import type { Metadata } from 'next';
import { OrganizationAnalyticsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Análises da Organização' };

export default async function OrganizationAnalyticsRoute({ params }: Props) {
  const { id } = await params;
  return <OrganizationAnalyticsPage organizationId={id} />;
}
