'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import { notificationKeys } from '../queries/get-notifications';
import type { NotificationResponse, NotificationsPageResponse } from '../types/notification.types';

interface DismissContext {
  previousList: NotificationResponse[] | undefined;
  previousPages: Array<{ queryKey: readonly unknown[]; data: InfiniteData<NotificationsPageResponse> }>;
}

// Dispensar (DELETE /notifications/:id). Removes the row from every cache the
// notification could be sitting in — the dropdown's flat list and any of the
// account screen's per-filter infinite pages — before the request settles, so
// the click feels instant. `notificationKeys.all` covers both prefixes.
export function useDismissNotificationMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string, DismissContext>({
    mutationFn: (id) => notificationsService.dismiss(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousList = queryClient.getQueryData<NotificationResponse[]>(notificationKeys.list());
      if (previousList) {
        queryClient.setQueryData<NotificationResponse[]>(
          notificationKeys.list(),
          previousList.filter((n) => n.id !== id),
        );
      }

      const previousPages: DismissContext['previousPages'] = [];
      for (const [queryKey, data] of queryClient.getQueriesData<InfiniteData<NotificationsPageResponse>>({
        queryKey: notificationKeys.all,
      })) {
        if (!data?.pages) continue;
        previousPages.push({ queryKey, data });
        queryClient.setQueryData<InfiniteData<NotificationsPageResponse>>(queryKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.filter((n) => n.id !== id),
          })),
        });
      }

      return { previousList, previousPages };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(notificationKeys.list(), context.previousList);
      }
      context?.previousPages.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
