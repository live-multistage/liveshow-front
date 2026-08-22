'use client';

import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '../services/subscription.service';

export const subscriptionKeys = {
  mine: ['subscriptions', 'mine'] as const,
};

export function useMySubscriptionsQuery() {
  return useQuery({
    queryKey: subscriptionKeys.mine,
    queryFn: () => subscriptionService.list(),
  });
}
