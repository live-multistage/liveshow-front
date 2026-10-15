'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReplaceReplayChaptersRequest, ReplayChaptersResponse } from '@live-show/api-contracts';
import { replayChaptersService } from '../services/replay-chapters.service';
import { replayChaptersEditorKey } from '../hooks/use-replay-chapters-editor';
import { LIVE_KEYS } from '@/features/streaming/queries/live.queries';
import { normalizeError } from '@/lib/http/errors';

export function useReplaceReplayChaptersMutation(eventId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReplaceReplayChaptersRequest) => {
      try {
        return await replayChaptersService.replace(eventId, body);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: (response: ReplayChaptersResponse) => {
      qc.setQueryData(replayChaptersEditorKey(eventId), response);
      // Viewers' player cache is separate; refresh it so they see the edit.
      qc.invalidateQueries({ queryKey: LIVE_KEYS.replayChapters(eventId) });
    },
  });
}

// On demand: importing from the schedule is a user action, not page data.
export function useReplayChapterSuggestionsMutation(eventId: string) {
  return useMutation({
    mutationFn: async () => {
      try {
        return await replayChaptersService.suggestions(eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
  });
}
