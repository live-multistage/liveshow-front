'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advertisementsService } from '../services/advertisements.service';
import { adsKey } from '../queries/use-list-ads';
import type { AdStatusAction } from '../types/advertisement.types';

export function useChangeAdStatusMutation(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adId, action }: { adId: string; action: AdStatusAction }) =>
      advertisementsService.changeStatus(adId, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adsKey(orgId ?? '') });
    },
  });
}
