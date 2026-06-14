'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationsService.list,
    enabled,
  });
}

export function useUnreadCountQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsService.unreadCount,
    enabled,
    // Keep the badge fresh while the user browses.
    refetchInterval: 60_000,
  });
}
