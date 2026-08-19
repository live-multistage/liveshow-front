'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const ORGANIZATION_DETAIL_KEY = (id: string) => ['platform-admin', 'organizations', id] as const;

export function useOrganizationDetailQuery(id: string) {
  return useQuery({
    queryKey: ORGANIZATION_DETAIL_KEY(id),
    queryFn: () => platformAdminService.getOrganization(id),
    enabled: !!id,
  });
}
