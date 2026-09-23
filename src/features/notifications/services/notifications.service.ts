import { httpClient } from '@/lib/http/client';
import type {
  NotificationFilter,
  NotificationResponse,
  NotificationsPageResponse,
  UnreadCountResponse,
} from '../types/notification.types';

export const notificationsService = {
  list: async (): Promise<NotificationResponse[]> => {
    const { data } = await httpClient.get<NotificationResponse[]>('/notifications');
    return data;
  },

  // Cursor-paginated feed for the account "Notificações" screen. The dropdown
  // keeps using `list` (small, unfiltered) — this is only for that page.
  page: async (params: {
    filter: NotificationFilter;
    cursor?: string;
    limit?: number;
  }): Promise<NotificationsPageResponse> => {
    const { data } = await httpClient.get<NotificationsPageResponse>('/notifications/page', {
      params: { filter: params.filter, cursor: params.cursor, limit: params.limit ?? 20 },
    });
    return data;
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await httpClient.get<UnreadCountResponse>('/notifications/unread-count');
    return data.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await httpClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await httpClient.patch('/notifications/read-all');
  },

  dismiss: async (id: string): Promise<void> => {
    await httpClient.delete(`/notifications/${id}`);
  },
};
