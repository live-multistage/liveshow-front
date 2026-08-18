'use client';

import { useQuery } from '@tanstack/react-query';
import { playbackProgressService } from '../services/playback-progress.service';

export const playbackProgressKeys = {
  all: ['playback-progress'] as const,
  list: ['playback-progress', 'list'] as const,
};

export function usePlaybackProgressQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: playbackProgressKeys.list,
    queryFn: () => playbackProgressService.list(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}
