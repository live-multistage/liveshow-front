'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import type { AuditLogEntry } from '../types/platform-admin.types';

const SETTINGS_KEY = ['platform-admin', 'settings'] as const;
const FLAGS_KEY = ['platform-admin', 'global-flags'] as const;

const SETTINGS_AUDIT_ACTIONS = ['FEATURE_FLAG_SET', 'FEE_RATE_SET', 'FEE_OVERRIDE_SET'] as const;

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

// All FEATURE_FLAG_SET entries, for deriving per-flag "who/when changed" via lastFlagChange().
export function useFlagAuditQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'flag-audit'] as const,
    queryFn: async () => {
      const result = await platformAdminService.searchAuditLog({ action: 'FEATURE_FLAG_SET', limit: 100 });
      return result.items;
    },
    staleTime: 30_000,
  });
}

// Recent audit entries (any action) for the settings page's "how it works" rail.
export function useSettingsAuditQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'settings-audit'] as const,
    queryFn: () => platformAdminService.getAuditLog(40),
    staleTime: 30_000,
  });
}

// Newest audit entry for a given flag key, matched on targetId with a
// targetLabel fallback for entries recorded before targetId was populated.
export function lastFlagChange(entries: AuditLogEntry[], key: string): AuditLogEntry | undefined {
  const matches = entries.filter((entry) => entry.targetId === key || entry.targetLabel === key);
  return matches.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

export function isSettingsAuditEntry(entry: AuditLogEntry): boolean {
  return (SETTINGS_AUDIT_ACTIONS as readonly string[]).includes(entry.action);
}
