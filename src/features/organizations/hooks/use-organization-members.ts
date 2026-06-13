'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';

export const organizationMembersKey = (orgId: string) =>
  ['organizations', orgId, 'members'] as const;

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: organizationMembersKey(orgId),
    queryFn: () => organizationMembersService.getMembers(orgId),
    enabled: !!orgId,
  });
}
