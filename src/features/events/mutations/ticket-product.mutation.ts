'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';
import type { CreateTicketRequest, UpdateTicketRequest } from '../types/event.types';

// The tickets cache now holds { products, serviceFeeRate } — invalidate and
// refetch instead of hand-patching the array shape.
export function useCreateTicketProductMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTicketRequest) => eventsService.createTicket(eventId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.tickets(eventId) }),
  });
}

export function useUpdateTicketProductMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: UpdateTicketRequest }) =>
      eventsService.updateTicketProduct(eventId, ticketId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.tickets(eventId) }),
  });
}

export function useDeleteTicketProductMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => eventsService.deleteTicketProduct(eventId, ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.tickets(eventId) }),
  });
}
