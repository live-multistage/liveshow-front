'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { EventScheduleItemInput } from '@live-show/api-contracts';
import { eventScheduleService } from '../services/event-schedule.service';
import { eventScheduleKey } from '../hooks/use-event-schedule';
import { normalizeError } from '@/lib/http/errors';

export function useReplaceEventScheduleMutation(eventId: string) {
  const qc = useQueryClient();
  const t = useTranslations('createEvent.schedule');

  return useMutation({
    mutationFn: async (items: EventScheduleItemInput[]) => {
      try {
        return await eventScheduleService.replaceSchedule(eventId, items);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('savedToast'));
    },
    onError: () => {
      toast.error(t('errorToast'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: eventScheduleKey(eventId) });
    },
  });
}
