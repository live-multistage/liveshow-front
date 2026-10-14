import { httpClient } from '@/lib/http/client';
import type {
  ReplaceReplayChaptersRequest,
  ReplayChapterSuggestion,
  ReplayChapterSuggestionsResponse,
  ReplayChaptersResponse,
} from '@live-show/api-contracts';

export const replayChaptersService = {
  get: async (eventId: string): Promise<ReplayChaptersResponse> => {
    const { data } = await httpClient.get<ReplayChaptersResponse>(`/events/${eventId}/replay-chapters`);
    return data;
  },

  replace: async (eventId: string, body: ReplaceReplayChaptersRequest): Promise<ReplayChaptersResponse> => {
    const { data } = await httpClient.put<ReplayChaptersResponse>(`/events/${eventId}/replay-chapters`, body);
    return data;
  },

  suggestions: async (eventId: string): Promise<ReplayChapterSuggestion[]> => {
    const { data } = await httpClient.get<ReplayChapterSuggestionsResponse>(
      `/events/${eventId}/replay-chapters/suggestions`,
    );
    return data.suggestions;
  },
};
