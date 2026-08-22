import { httpClient } from '@/lib/http/client';
import type { MySubscription } from '../types/subscription.types';

export const subscriptionService = {
  list: async (): Promise<MySubscription[]> => {
    const { data } = await httpClient.get<MySubscription[]>('/me/subscriptions');
    return data;
  },

  cancel: async (id: string): Promise<MySubscription> => {
    const { data } = await httpClient.post<MySubscription>(`/me/subscriptions/${id}/cancel`);
    return data;
  },

  resume: async (id: string): Promise<MySubscription> => {
    const { data } = await httpClient.post<MySubscription>(`/me/subscriptions/${id}/resume`);
    return data;
  },

  portal: async (id: string): Promise<{ url: string }> => {
    const { data } = await httpClient.post<{ url: string }>(`/me/subscriptions/${id}/portal`);
    return data;
  },
};
