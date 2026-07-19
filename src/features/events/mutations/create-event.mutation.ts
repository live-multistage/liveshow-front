'use client';

import { useMutation } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { CreateEventRequest, CreateTicketRequest, EventResponse } from '../types/event.types';

interface CreateEventWithTicketsPayload {
  event: CreateEventRequest;
  tickets: CreateTicketRequest[];
  isFree?: boolean;
}

export function useCreateEventMutation(onSuccess?: (event: EventResponse) => void) {
  return useMutation<EventResponse, AppError, CreateEventWithTicketsPayload>({
    mutationFn: async ({ event, tickets, isFree }) => {
      try {
        const created = await eventsService.create(event);
        // Free event: one system-managed "Acesso Gratuito" product, no paid
        // tickets. Otherwise create the paid tickets the organizer added.
        if (isFree) {
          await eventsService.setFreeStatus(created.id, true);
        } else {
          await Promise.all(tickets.map((t) => eventsService.createTicket(created.id, t)));
        }
        return created;
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess,
  });
}
