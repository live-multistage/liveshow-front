'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export function useStreamHealthQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'stream-health'] as const,
    queryFn: platformAdminService.getStreamHealth,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
