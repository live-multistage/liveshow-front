import { httpClient } from '@/lib/http/client';
import type { MySubscription } from '../types/subscription.types';

// cancel/resume (me-subscriptions.controller.ts) return the subscription row
// only — no `channel` block, unlike list().
type MySubscriptionAction = Omit<MySubscription, 'channel'>;

export const subscriptionService = {
  list: async (): Promise<MySubscription[]> => {
    const { data } = await httpClient.get<MySubscription[]>('/me/subscriptions');
    return data;
  },

  cancel: async (id: string): Promise<MySubscriptionAction> => {
    const { data } = await httpClient.post<MySubscriptionAction>(`/me/subscriptions/${id}/cancel`);
    return data;
  },

  resume: async (id: string): Promise<MySubscriptionAction> => {
    const { data } = await httpClient.post<MySubscriptionAction>(`/me/subscriptions/${id}/resume`);
    return data;
  },

  portal: async (id: string): Promise<{ url: string }> => {
    const { data } = await httpClient.post<{ url: string }>(`/me/subscriptions/${id}/portal`);
    return data;
  },
};
