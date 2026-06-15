'use client';

import { useQuery } from '@tanstack/react-query';
import { streamingService } from '../services/streaming.service';

export const LIVE_KEYS = {
  access: (eventId: string) => ['live', 'access', eventId] as const,
  playback: (eventId: string) => ['live', 'playback', eventId] as const,
};

// One-shot (cached) entitlement check.
export function useLiveAccessQuery(eventId: string) {
  return useQuery({
    queryKey: LIVE_KEYS.access(eventId),
    queryFn: () => streamingService.checkLiveAccess(eventId),
    staleTime: 60_000,
  });
}

// Live playback resolution. Polls every 5s while `enabled` so the player appears
// when the event goes live / a camera starts transcoding.
export function useLivePlaybackQuery(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: LIVE_KEYS.playback(eventId),
    queryFn: () => streamingService.getLivePlayback(eventId),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}
