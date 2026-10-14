'use client';

import { useQuery } from '@tanstack/react-query';
import { replayChaptersService } from '../services/replay-chapters.service';

export const replayChaptersEditorKey = (eventId: string) => ['events', eventId, 'replay-chapters'] as const;

export function useReplayChaptersEditorQuery(eventId: string) {
  return useQuery({
    queryKey: replayChaptersEditorKey(eventId),
    queryFn: () => replayChaptersService.get(eventId),
    enabled: !!eventId,
  });
}
