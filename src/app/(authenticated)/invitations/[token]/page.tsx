import type { Metadata } from 'next';
import { AcceptInvitationPage } from '@/features/organizations';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = { title: 'Convite' };

export default async function OrganizationInvitationPage({ params }: Props) {
  const { token } = await params;
  return <AcceptInvitationPage token={token} />;
}
