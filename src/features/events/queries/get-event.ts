'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse } from '../types/event.types';

// Defined here for client hooks; the server page inlines the same strings
// to avoid importing this 'use client' module in a Server Component.
export const eventKeys = {
  detail: (id: string) => ['events', 'detail', id] as const,
  bySlug: (slug: string) => ['events', 'by-slug', slug] as const,
  tickets: (eventId: string) => ['events', 'tickets', eventId] as const,
  photos: (eventId: string) => ['events', 'photos', eventId] as const,
};

export function useGetEventQuery(id: string, initialData?: EventResponse) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getEvent(id),
    enabled: !!id,
    initialData,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useEventBySlugQuery(slug: string, initialData?: EventResponse) {
  return useQuery({
    queryKey: eventKeys.bySlug(slug),
    queryFn: () => eventsService.getEventBySlug(slug),
    enabled: !!slug,
    initialData,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

// GET /shows/:showId/tickets returns { products, serviceFeeRate }. Most callers
// only care about the ticket list, so this unwraps it; useServiceFeeRateQuery
// below shares the same queryKey/queryFn (react-query dedupes the fetch) for
// callers that need the fee instead.
export function useListTicketProductsQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.tickets(eventId),
    queryFn: () => eventsService.listTicketProducts(eventId),
    enabled: !!eventId,
    select: (data) => data.products,
  });
}

export function useServiceFeeRateQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.tickets(eventId),
    queryFn: () => eventsService.listTicketProducts(eventId),
    enabled: !!eventId,
    select: (data) => data.serviceFeeRate,
  });
}

export function useListEventPhotosQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.photos(eventId),
    queryFn: () => eventsService.listPhotos(eventId),
    enabled: !!eventId,
  });
}
