import { httpClient } from '@/lib/http/client';
import type { PlaybackProgressEntry } from '../types/playback-progress.types';

export const playbackProgressService = {
  list: async (): Promise<PlaybackProgressEntry[]> => {
    const { data } = await httpClient.get<PlaybackProgressEntry[]>('/me/playback-progress');
    return data;
  },

  save: async (input: {
    eventId: string;
    positionSeconds: number;
    durationSeconds: number;
  }): Promise<void> => {
    await httpClient.put('/me/playback-progress', input);
  },
};
