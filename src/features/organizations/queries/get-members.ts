'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';

export const orgMembersKey = (orgId: string) => ['organizations', orgId, 'members'] as const;

export function useOrgMembersQuery(orgId: string) {
  return useQuery({
    queryKey: orgMembersKey(orgId),
    queryFn: () => organizationsService.getMembers(orgId),
    enabled: !!orgId,
  });
}
