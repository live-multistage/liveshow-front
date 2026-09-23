'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/account/hooks/use-auth';
import { notificationsService } from '../services/notifications.service';
import type { NotificationFilter } from '../types/notification.types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  page: (filter: NotificationFilter) => [...notificationKeys.all, 'page', filter] as const,
};

// User-scoped: gate on auth being hydrated + logged in, else the request races
// the token on a fresh load and 401s (see get-wishlist.ts).
export function useNotificationsQuery(enabled = true) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationsService.list,
    enabled: !isLoading && isLoggedIn && enabled,
    staleTime: 30_000, // avoid a refetch on every dropdown open/remount
  });
}

export function useUnreadCountQuery(enabled = true) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsService.unreadCount,
    enabled: !isLoading && isLoggedIn && enabled,
    // Keep the badge fresh while the user browses. staleTime matches the poll
    // interval so a remount reuses the cached count instead of refetching.
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

// Cursor-paginated feed for the account "Notificações" screen. A distinct
// query key per filter keeps each tab's cursor chain independent — switching
// filters starts a fresh page 1 instead of reusing another tab's cursor.
export function useNotificationsPageQuery(filter: NotificationFilter, enabled = true) {
  const { isLoggedIn, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: notificationKeys.page(filter),
    queryFn: ({ pageParam }) => notificationsService.page({ filter, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !isLoading && isLoggedIn && enabled,
    staleTime: 30_000,
  });
}
