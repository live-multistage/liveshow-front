'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const ORGANIZATION_MEMBERS_KEY = (id: string) => ['platform-admin', 'organizations', id, 'members'] as const;

export function useOrganizationMembersQuery(id: string) {
  return useQuery({
    queryKey: ORGANIZATION_MEMBERS_KEY(id),
    queryFn: () => platformAdminService.getMembers(id),
    enabled: !!id,
  });
}
