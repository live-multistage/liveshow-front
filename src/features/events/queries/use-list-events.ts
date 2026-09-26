'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse, ListEventsFilter, ListEventsParams, PaginatedEventsResponse } from '../types/event.types';

export const LIST_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'list', filter];
export const LIST_EVENTS_PAGE_KEY = (params: ListEventsParams) => ['events', 'page', params];

// ponytail: first page only (pageSize 50, the API max). Consumers that need
// the full catalog paginated should use useListEventsPageQuery instead.
export function useListEventsQuery(filter: ListEventsFilter = 'all', initialData?: EventResponse[]) {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents({ filter }).then((r) => r.items),
    staleTime: 5 * 60_000,
    initialData,
  });
}

// Numbered-pagination version of the listing (used by /events). Keeps the
// previous page's data on screen while the next page loads.
export function useListEventsPageQuery(params: ListEventsParams, initialData?: PaginatedEventsResponse) {
  return useQuery({
    queryKey: LIST_EVENTS_PAGE_KEY(params),
    queryFn: () => eventsService.listEvents(params),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    initialData,
  });
}
