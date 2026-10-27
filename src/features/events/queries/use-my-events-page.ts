'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { MY_EVENTS_KEY } from './get-my-events';
import type { MyEventsPageParams } from '../types/event.types';

// Both keys live under MY_EVENTS_KEY so the existing event mutations, which
// invalidate that prefix, refresh the paged dashboard list and its counts too.
export const MY_EVENTS_PAGE_KEY = (params: MyEventsPageParams) => [...MY_EVENTS_KEY, 'page', params];
export const MY_EVENT_COUNTS_KEY = [...MY_EVENTS_KEY, 'counts'];

export function useMyEventsPageQuery(params: MyEventsPageParams) {
  return useQuery({
    queryKey: MY_EVENTS_PAGE_KEY(params),
    queryFn: () => eventsService.listMyEvents(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyEventCountsQuery() {
  return useQuery({
    queryKey: MY_EVENT_COUNTS_KEY,
    queryFn: eventsService.getMyEventCounts,
  });
}
