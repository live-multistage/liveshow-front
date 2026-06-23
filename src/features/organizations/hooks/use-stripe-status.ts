'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';

export const stripeStatusKey = (orgId: string) =>
  ['organizations', orgId, 'stripe'] as const;

export function useStripeStatus(orgId: string) {
  return useQuery({
    queryKey: stripeStatusKey(orgId),
    queryFn: () => organizationService.getStripeStatus(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
