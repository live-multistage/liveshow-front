'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { RecommendedEventsResponse } from '../types/event.types';

// Defined here for the client hook; the server page (get-recommended-events.server.ts)
// inlines its own fetch rather than importing this 'use client' module —
// same boundary constraint documented in get-event.ts's eventKeys.
export const RECOMMENDED_EVENTS_KEY = ['events', 'recommended'];

export function useRecommendedEventsQuery(initialData?: RecommendedEventsResponse) {
  return useQuery({
    queryKey: RECOMMENDED_EVENTS_KEY,
    queryFn: eventsService.getRecommendedEvents,
    initialData,
    staleTime: 5 * 60_000,
  });
}
