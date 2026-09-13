'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FollowTargetType } from '@live-show/api-contracts';
import { followsService } from '../services/follows.service';
import { followKeys } from '../queries/get-follows';
import { normalizeError } from '@/lib/http/errors';

interface ToggleFollowArgs {
  targetType: FollowTargetType;
  targetId: string;
  /** Estado ATUAL (antes do toggle) — decide se a mutation segue ou deixa de seguir. */
  following: boolean;
}

/**
 * Espelha o toggle otimista do wishlist (ids + contador de seguidores),
 * mesma justificativa: o botão de seguir precisa reagir na hora do clique.
 */
export function useToggleFollowMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetType, targetId, following }: ToggleFollowArgs) => {
      try {
        if (following) {
          await followsService.unfollow(targetType, targetId);
        } else {
          await followsService.follow(targetType, targetId);
        }
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onMutate: async ({ targetType, targetId, following }: ToggleFollowArgs) => {
      const idsKey = followKeys.ids(targetType);
      const countKey = followKeys.count(targetType, targetId);

      await qc.cancelQueries({ queryKey: idsKey });
      await qc.cancelQueries({ queryKey: countKey });

      const previousIds = qc.getQueryData<string[]>(idsKey);
      const previousCount = qc.getQueryData<number>(countKey);

      qc.setQueryData<string[]>(idsKey, (current) => {
        const ids = current ?? [];
        if (following) return ids.filter((id) => id !== targetId);
        return ids.includes(targetId) ? ids : [...ids, targetId];
      });

      if (previousCount !== undefined) {
        qc.setQueryData<number>(countKey, Math.max(0, previousCount + (following ? -1 : 1)));
      }

      return { previousIds, previousCount, idsKey, countKey };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      if (context.previousIds !== undefined) qc.setQueryData(context.idsKey, context.previousIds);
      else qc.removeQueries({ queryKey: context.idsKey });
      if (context.previousCount !== undefined) qc.setQueryData(context.countKey, context.previousCount);
      else qc.removeQueries({ queryKey: context.countKey });
    },
    onSettled: (_data, _err, { targetType, targetId }) => {
      qc.invalidateQueries({ queryKey: followKeys.ids(targetType) });
      qc.invalidateQueries({ queryKey: followKeys.list(targetType) });
      qc.invalidateQueries({ queryKey: followKeys.count(targetType, targetId) });
    },
  });
}
