'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const ORG_FEATURE_FLAGS_KEY = (id: string) => ['platform-admin', 'organizations', id, 'flags'] as const;

export function useOrgFeatureFlagsQuery(id: string) {
  return useQuery({
    queryKey: ORG_FEATURE_FLAGS_KEY(id),
    queryFn: () => platformAdminService.getFlags(id),
    enabled: !!id,
  });
}
