'use client';

import { useQuery } from '@tanstack/react-query';
import { streamingService } from '../services/streaming.service';

export const LIVE_KEYS = {
  access: (eventId: string) => ['live', 'access', eventId] as const,
  replayAccess: (eventId: string) => ['live', 'replay-access', eventId] as const,
  playback: (eventId: string) => ['live', 'playback', eventId] as const,
  replayPlayback: (eventId: string) => ['live', 'replay-playback', eventId] as const,
};

// One-shot (cached) live entitlement check. `enabled` lets callers skip it when
// the user is logged out (the endpoint is JWT-only).
export function useLiveAccessQuery(eventId: string, enabled = true) {
  return useQuery({
    queryKey: LIVE_KEYS.access(eventId),
    queryFn: () => streamingService.checkLiveAccess(eventId),
    enabled,
    staleTime: 60_000,
  });
}

// One-shot (cached) replay entitlement check. Same JWT gating as live access.
export function useReplayAccessQuery(eventId: string, enabled = true) {
  return useQuery({
    queryKey: LIVE_KEYS.replayAccess(eventId),
    queryFn: () => streamingService.checkReplayAccess(eventId),
    enabled,
    staleTime: 60_000,
  });
}

// Live playback resolution. Polls every 5s while `enabled` so the player appears
// when the event goes live / a camera starts transcoding.
// staleTime sits just under the refetchInterval: remounts within the 5s window
// reuse the cached response instead of firing an extra request.
export function useLivePlaybackQuery(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: LIVE_KEYS.playback(eventId),
    queryFn: () => streamingService.getLivePlayback(eventId),
    enabled,
    staleTime: 4_500,
    refetchInterval: enabled ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}

// Replay playback resolution. One-shot, no polling — an archived broadcast's
// camera list doesn't change while a viewer is watching it.
export function useReplayPlaybackQuery(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: LIVE_KEYS.replayPlayback(eventId),
    queryFn: () => streamingService.getReplayPlayback(eventId),
    enabled,
    staleTime: 60_000,
  });
}
