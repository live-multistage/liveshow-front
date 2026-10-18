'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { chatService } from '../services/chat.service';
import { chatKeys } from '../queries/chat.keys';

export const PARTICIPANTS_DEBOUNCE_MS = 150;

// `query === null` = no mention being typed (or the viewer has no chat access: callers pass null). Cached per room + query.
export function useChatParticipants(eventId: string, streamId: string | null, query: string | null) {
  const debounced = useDebouncedValue(query, PARTICIPANTS_DEBOUNCE_MS);
  return useQuery({
    queryKey: chatKeys.participants(eventId, streamId, debounced ?? ''),
    queryFn: () => chatService.participants(eventId, debounced ?? '', streamId),
    enabled: debounced !== null,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
