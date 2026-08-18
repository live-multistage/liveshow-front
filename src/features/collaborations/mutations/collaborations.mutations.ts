'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { collaborationsService } from '../services/collaborations.service';
import { collaborationsKeys } from '../queries/collaborations.queries';
import { normalizeError } from '@/lib/http/errors';

export function useInviteCollaboratorMutation(eventId: string) {
  const qc = useQueryClient();
  const t = useTranslations('collaborations');

  return useMutation({
    mutationFn: async (organizationId: string) => {
      try {
        return await collaborationsService.invite(eventId, organizationId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: () => {
      toast.error(t('errorToast'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: collaborationsKeys.eventCollaborators(eventId) });
    },
  });
}

export function useCancelInviteMutation(eventId: string) {
  const qc = useQueryClient();
  const t = useTranslations('collaborations');

  return useMutation({
    mutationFn: async (collaborationId: string) => {
      try {
        return await collaborationsService.cancelInvite(eventId, collaborationId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: () => {
      toast.error(t('errorToast'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: collaborationsKeys.eventCollaborators(eventId) });
    },
  });
}

export function useRespondToInviteMutation(orgId: string) {
  const qc = useQueryClient();
  const t = useTranslations('collaborations');

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'decline' }) => {
      try {
        if (action === 'accept') {
          return await collaborationsService.accept(id);
        } else {
          return await collaborationsService.decline(id);
        }
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: () => {
      toast.error(t('errorToast'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: collaborationsKeys.orgInvites(orgId) });
    },
  });
}
