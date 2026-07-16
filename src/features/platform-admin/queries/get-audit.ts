'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export function useAuditLogQuery(limit = 20) {
  return useQuery({
    queryKey: ['platform-admin', 'audit', limit] as const,
    queryFn: () => platformAdminService.getAuditLog(limit),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
