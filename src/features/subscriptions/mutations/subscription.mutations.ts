'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { subscriptionService } from '../services/subscription.service';
import { subscriptionKeys } from '../queries/subscription.queries';
import { normalizeError } from '@/lib/http/errors';

function useErrorToast() {
  const t = useTranslations('account.subscriptions');
  return () => toast.error(t('error'));
}

export function useCancelSubscriptionMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await subscriptionService.cancel(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}

export function useResumeSubscriptionMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await subscriptionService.resume(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: () => qc.invalidateQueries({ queryKey: subscriptionKeys.mine }),
  });
}

export function usePortalMutation() {
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await subscriptionService.portal(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    // O portal do Stripe é hospedado — a navegação sai do app, não há estado
    // local para atualizar antes disso (mesmo padrão do checkout de assinatura).
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: toastError,
  });
}
