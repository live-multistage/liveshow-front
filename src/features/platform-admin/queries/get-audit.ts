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

export interface AuditSearchParams {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

export function useAuditSearchQuery(params: AuditSearchParams) {
  return useQuery({
    queryKey: ['platform-admin', 'audit-search', params] as const,
    queryFn: () => platformAdminService.searchAuditLog(params),
    staleTime: 15_000,
  });
}
