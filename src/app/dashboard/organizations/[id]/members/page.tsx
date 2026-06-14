import type { Metadata } from 'next';
import { MembersPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Membros' };

export default async function OrganizationMembersPage({ params }: Props) {
  const { id } = await params;
  return <MembersPage organizationId={id} />;
}
