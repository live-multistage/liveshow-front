'use client';

import { useQuery } from '@tanstack/react-query';
import { eventScheduleService } from '../services/event-schedule.service';

export const eventScheduleKey = (eventId: string) => ['events', eventId, 'schedule'] as const;

export function useEventSchedule(eventId: string) {
  return useQuery({
    queryKey: eventScheduleKey(eventId),
    queryFn: () => eventScheduleService.getSchedule(eventId),
    enabled: !!eventId,
  });
}
