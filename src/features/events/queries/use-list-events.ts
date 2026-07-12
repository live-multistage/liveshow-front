'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse, ListEventsFilter } from '../types/event.types';

export const LIST_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'list', filter];
export const INFINITE_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'infinite', filter];

// ponytail: first page only (pageSize 50, the API max). Consumers that need
// the full catalog paginated should use useInfiniteEventsQuery instead.
export function useListEventsQuery(filter: ListEventsFilter = 'all', initialData?: EventResponse[]) {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents(filter).then((r) => r.items),
    staleTime: 5 * 60_000,
    initialData,
  });
}

export function useInfiniteEventsQuery(filter: ListEventsFilter = 'all') {
  return useInfiniteQuery({
    queryKey: INFINITE_EVENTS_KEY(filter),
    queryFn: ({ pageParam }) => eventsService.listEvents(filter, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    staleTime: 5 * 60_000,
  });
}
