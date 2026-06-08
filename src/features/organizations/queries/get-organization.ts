'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';

export const orgDetailKey = (orgId: string) => ['organizations', orgId] as const;

export function useOrgQuery(orgId: string) {
  return useQuery({
    queryKey: orgDetailKey(orgId),
    queryFn: () => organizationsService.getById(orgId),
    enabled: !!orgId,
  });
}
