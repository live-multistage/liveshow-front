'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import { MY_EVENTS_KEY } from '../queries/get-my-events';

export function usePublishEventMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => eventsService.publishEvent(eventId),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });
    },
  });
}

export function useUnpublishEventMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => eventsService.unpublishEvent(eventId),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });
    },
  });
}

export function useFinishEventMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => eventsService.finishEvent(eventId),
    onSuccess: (updated) => {
      queryClient.setQueryData(eventKeys.detail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });
    },
  });
}
