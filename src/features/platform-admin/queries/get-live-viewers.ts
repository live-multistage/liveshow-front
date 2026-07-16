'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const LIVE_VIEWERS_KEY = ['platform-admin', 'live-viewers'] as const;

export function useLiveViewersQuery() {
  return useQuery({
    queryKey: LIVE_VIEWERS_KEY,
    queryFn: platformAdminService.getLiveViewers,
    // Realtime ops widget — poll; the backend keeps its own ring buffer.
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
}
