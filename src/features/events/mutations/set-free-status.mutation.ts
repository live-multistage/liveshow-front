'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import { normalizeError, type AppError } from '@/lib/http/errors';

// Toggling free access rewrites the event's ticket products server-side, so
// refetch both the event and its ticket list afterwards.
export function useSetEventFreeStatusMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; isFree: boolean }, AppError, boolean>({
    mutationFn: async (isFree) => {
      try {
        return await eventsService.setFreeStatus(eventId, isFree);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.tickets(eventId) });
    },
  });
}
