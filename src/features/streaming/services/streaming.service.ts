import { httpClient } from '@/lib/http/client';
import type { LivePlaybackResponse, LiveAccessResponse, ReplayPlaybackResponse } from '../types/live.types';

export const streamingService = {
  // Whether the logged-in user is entitled to watch this event live.
  checkLiveAccess: async (eventId: string): Promise<boolean> => {
    const { data } = await httpClient.get<LiveAccessResponse>(`/shows/${eventId}/access/live`);
    return data.authorized;
  },

  // Whether the logged-in user is entitled to watch this event's replay.
  checkReplayAccess: async (eventId: string): Promise<boolean> => {
    const { data } = await httpClient.get<LiveAccessResponse>(`/shows/${eventId}/access/replay`);
    return data.authorized;
  },

  // Resolve the event's live cameras (each with an origin manifest path).
  // The backend 403s when not entitled; callers should gate with checkLiveAccess first.
  getLivePlayback: async (eventId: string): Promise<LivePlaybackResponse> => {
    const { data } = await httpClient.get<LivePlaybackResponse>(`/shows/${eventId}/live-playback`);
    return data;
  },

  // Resolve the event's replayable cameras (each with a /packages/.../replay
  // manifest path, or null while nothing archived yet). 403s when not
  // entitled; callers should gate with checkReplayAccess first.
  getReplayPlayback: async (eventId: string): Promise<ReplayPlaybackResponse> => {
    const { data } = await httpClient.get<ReplayPlaybackResponse>(`/shows/${eventId}/replay-playback`);
    return data;
  },
};
