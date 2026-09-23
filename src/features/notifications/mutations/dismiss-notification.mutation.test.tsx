import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/notifications.service', () => ({
  notificationsService: { dismiss: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDismissNotificationMutation } from './dismiss-notification.mutation';
import { notificationsService } from '../services/notifications.service';
import { notificationKeys } from '../queries/get-notifications';
import type { NotificationResponse, NotificationsPageResponse } from '../types/notification.types';

const mockedDismiss = vi.mocked(notificationsService.dismiss);

const NOTIFICATION = (id: string): NotificationResponse => ({
  id,
  type: 'EVENT',
  title: `Notification ${id}`,
  message: 'msg',
  read: false,
  link: null,
  createdAt: '2026-09-20T10:00:00.000Z',
});

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useDismissNotificationMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('optimistically removes the notification from the flat list cache', async () => {
    mockedDismiss.mockResolvedValue(undefined);
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(notificationKeys.list(), [NOTIFICATION('1'), NOTIFICATION('2')]);

    const { result } = renderHook(() => useDismissNotificationMutation(), { wrapper });
    result.current.mutate('1');

    // Optimistic — the cache is updated before the request settles.
    await waitFor(() =>
      expect(queryClient.getQueryData<NotificationResponse[]>(notificationKeys.list())).toEqual([NOTIFICATION('2')]),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedDismiss).toHaveBeenCalledWith('1');
  });

  it('removes the notification from a paged (infinite) cache and invalidates on settle', async () => {
    mockedDismiss.mockResolvedValue(undefined);
    const { queryClient, wrapper } = makeWrapper();
    const page: NotificationsPageResponse = {
      items: [NOTIFICATION('1'), NOTIFICATION('2')],
      nextCursor: null,
      counts: { all: 2, unread: 2, shows: 2, tickets: 0, account: 0 },
    };
    queryClient.setQueryData(notificationKeys.page('all'), { pages: [page], pageParams: [undefined] });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDismissNotificationMutation(), { wrapper });
    result.current.mutate('1');

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ pages: NotificationsPageResponse[] }>(notificationKeys.page('all'));
      expect(cached?.pages[0].items).toEqual([NOTIFICATION('2')]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it('rolls back the optimistic removal on error', async () => {
    mockedDismiss.mockRejectedValue(new Error('boom'));
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(notificationKeys.list(), [NOTIFICATION('1')]);

    const { result } = renderHook(() => useDismissNotificationMutation(), { wrapper });
    result.current.mutate('1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData<NotificationResponse[]>(notificationKeys.list())).toEqual([NOTIFICATION('1')]);
  });
});
