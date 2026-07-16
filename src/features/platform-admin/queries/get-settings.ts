'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

const SETTINGS_KEY = ['platform-admin', 'settings'] as const;
const FLAGS_KEY = ['platform-admin', 'global-flags'] as const;

export function usePlatformSettingsQuery() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: platformAdminService.getPlatformSettings,
    staleTime: 60_000,
  });
}

export function useSetDefaultFeeRateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rate: number) => platformAdminService.setDefaultFeeRate(rate),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useGlobalFlagsQuery() {
  return useQuery({
    queryKey: FLAGS_KEY,
    queryFn: platformAdminService.getGlobalFlags,
    staleTime: 60_000,
  });
}

export function useSetGlobalFlagMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      platformAdminService.setGlobalFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: FLAGS_KEY }),
  });
}
