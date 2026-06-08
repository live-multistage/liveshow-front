'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';

export const MY_EVENTS_KEY = ['events', 'mine'];

export function useMyEventsQuery() {
  return useQuery({
    queryKey: MY_EVENTS_KEY,
    queryFn: eventsService.getMyEvents,
  });
}
