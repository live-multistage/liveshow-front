'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse } from '../types/event.types';

export const eventKeys = {
  detail: (id: string) => ['events', 'detail', id] as const,
  tickets: (eventId: string) => ['events', 'tickets', eventId] as const,
  photos: (eventId: string) => ['events', 'photos', eventId] as const,
};

export function useGetEventQuery(id: string, initialData?: EventResponse) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getEvent(id),
    enabled: !!id,
    initialData,
  });
}

export function useListTicketProductsQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.tickets(eventId),
    queryFn: () => eventsService.listTicketProducts(eventId),
    enabled: !!eventId,
  });
}

export function useListEventPhotosQuery(eventId: string) {
  return useQuery({
    queryKey: eventKeys.photos(eventId),
    queryFn: () => eventsService.listPhotos(eventId),
    enabled: !!eventId,
  });
}
