'use client';

import { useMutation } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { CreateEventRequest, CreateTicketRequest, EventResponse } from '../types/event.types';

interface CreateEventWithTicketsPayload {
  event: CreateEventRequest;
  tickets: CreateTicketRequest[];
}

export function useCreateEventMutation(onSuccess?: (event: EventResponse) => void) {
  return useMutation<EventResponse, AppError, CreateEventWithTicketsPayload>({
    mutationFn: async ({ event, tickets }) => {
      try {
        const created = await eventsService.create(event);
        await Promise.all(tickets.map((t) => eventsService.createTicket(created.id, t)));
        return created;
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess,
  });
}
