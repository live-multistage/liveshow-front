'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import type { UpdateEventRequest } from '../types/event.types';

export function useUpdateEventMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateEventRequest) => eventsService.updateEvent(eventId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
    },
  });
}
