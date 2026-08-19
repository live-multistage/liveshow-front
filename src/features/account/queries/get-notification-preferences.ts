'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';
import type { NotificationPreferences } from '../types/notification-preferences.types';

export const notificationPreferencesKey = ['account', 'notification-preferences'] as const;

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: notificationPreferencesKey,
    queryFn: async () => {
      const { data } = await httpClient.get<NotificationPreferences>('/notifications/preferences');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const qc = useQueryClient();
  return useMutation<NotificationPreferences, AppError, Partial<NotificationPreferences>>({
    mutationFn: async (changes) => {
      const { data } = await httpClient.put<NotificationPreferences>('/notifications/preferences', changes);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(notificationPreferencesKey, data);
    },
  });
}
