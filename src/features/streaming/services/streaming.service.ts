import { httpClient } from '@/lib/http/client';
import type { LivePlaybackResponse, LiveAccessResponse } from '../types/live.types';

export const streamingService = {
  // Whether the logged-in user is entitled to watch this event live.
  checkLiveAccess: async (eventId: string): Promise<boolean> => {
    const { data } = await httpClient.get<LiveAccessResponse>(`/shows/${eventId}/access/live`);
    return data.authorized;
  },

  // Resolve the event's live cameras (each with an origin manifest path).
  // The backend 403s when not entitled; callers should gate with checkLiveAccess first.
  getLivePlayback: async (eventId: string): Promise<LivePlaybackResponse> => {
    const { data } = await httpClient.get<LivePlaybackResponse>(`/shows/${eventId}/live-playback`);
    return data;
  },
};
