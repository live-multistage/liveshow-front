'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse, ListEventsFilter } from '../types/event.types';

export const LIST_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'list', filter];

export function useListEventsQuery(filter: ListEventsFilter = 'all', initialData?: EventResponse[]) {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents(filter),
    staleTime: 5 * 60_000,
    initialData,
  });
}
