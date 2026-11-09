'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import type { EventWithOverlayAds, OverlayAdsSettings } from '../types/event.types';

export function useSetOverlayAdsMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: OverlayAdsSettings) => eventsService.setOverlayAds(eventId, settings),
    // Só confirma depois do servidor: em falha o cache fica como estava e a chave volta.
    onSuccess: ({ overlayAds }) => {
      queryClient.setQueryData<EventWithOverlayAds>(eventKeys.detail(eventId), (event) =>
        event ? { ...event, overlayAds } : event,
      );
    },
  });
}
