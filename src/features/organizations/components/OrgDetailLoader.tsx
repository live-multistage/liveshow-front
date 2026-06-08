'use client';

import { useAuth } from '@/features/account';
import { useOrgQuery } from '../queries/get-organization';
import { OrgDetailPageContent } from './OrgDetailPageContent';

interface Props {
  orgId: string;
}

export function OrgDetailLoader({ orgId }: Props) {
  const { user } = useAuth();
  const { data: org, isLoading, isError } = useOrgQuery(orgId);

  if (isLoading) return null;
  if (isError || !org) return <p style={{ color: '#ef4444', padding: '2rem' }}>Organização não encontrada</p>;
  if (!user) return null;

  return <OrgDetailPageContent org={org} currentUserId={user.id} />;
}
