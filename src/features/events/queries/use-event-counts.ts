'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventFacetCounts, ListEventsParams } from '../types/event.types';

export type EventCountsBase = Pick<ListEventsParams, 'category' | 'subtype' | 'tag' | 'city'>;

// Chip badge counts over the whole catalog (scoped by category/subtype/tag/city).
export function useEventCountsQuery(base: EventCountsBase, initialData?: EventFacetCounts) {
  return useQuery({
    queryKey: ['events', 'counts', base],
    queryFn: () => eventsService.getEventCounts(base),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    initialData,
  });
}
