import { httpClient } from '@/lib/http/client';
import type { NotificationResponse, UnreadCountResponse } from '../types/notification.types';

export const notificationsService = {
  list: async (): Promise<NotificationResponse[]> => {
    const { data } = await httpClient.get<NotificationResponse[]>('/notifications');
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
};
