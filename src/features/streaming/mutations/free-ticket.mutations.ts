'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkoutService } from '@/features/checkout/services/checkout.service';
import { eventKeys } from '@/features/events/queries/get-event';
import { LIVE_KEYS } from '../queries/live.queries';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useClaimFreeTicketMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketProductId: string) => {
      try {
        return await checkoutService.claimFreeTicket(ticketProductId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIVE_KEYS.access(eventId) });
      qc.invalidateQueries({ queryKey: LIVE_KEYS.replayAccess(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.myTickets(eventId) });
      // A free unlock from the player must not wait for the next 5s poll.
      qc.invalidateQueries({ queryKey: LIVE_KEYS.playback(eventId) });
      qc.invalidateQueries({ queryKey: LIVE_KEYS.replayPlayback(eventId) });
    },
    onError: (err: AppError) => {
      toast.error(err.message || 'Não foi possível liberar seu acesso. Tente novamente.');
    },
  });
}
