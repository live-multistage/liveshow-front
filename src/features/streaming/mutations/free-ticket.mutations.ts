'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkoutService } from '@/features/checkout/services/checkout.service';
import { LIVE_KEYS } from '../queries/live.queries';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useClaimFreeTicketMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await checkoutService.claimFreeTicket(eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIVE_KEYS.access(eventId) });
      qc.invalidateQueries({ queryKey: LIVE_KEYS.replayAccess(eventId) });
    },
    onError: (err: AppError) => {
      toast.error(err.message || 'Não foi possível liberar seu acesso. Tente novamente.');
    },
  });
}
