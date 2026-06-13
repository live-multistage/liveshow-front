'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import type { CreateTicketRequest, TicketProductResponse } from '../types/event.types';

export function useCreateTicketProductMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTicketRequest) => eventsService.createTicket(eventId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData<TicketProductResponse[]>(
        eventKeys.tickets(eventId),
        (prev = []) => [...prev, created],
      );
    },
  });
}

export function useDeleteTicketProductMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => eventsService.deleteTicketProduct(eventId, ticketId),
    onSuccess: (_data, ticketId) => {
      queryClient.setQueryData<TicketProductResponse[]>(
        eventKeys.tickets(eventId),
        (prev = []) => prev.filter((t) => t.id !== ticketId),
      );
    },
  });
}
