'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';

export const asaasSubaccountKey = (orgId: string) =>
  ['organizations', orgId, 'asaas'] as const;

export function useAsaasSubaccount(orgId: string) {
  return useQuery({
    queryKey: asaasSubaccountKey(orgId),
    queryFn: () => organizationService.getAsaasSubaccount(orgId),
    enabled: !!orgId,
    // Approval happens in Asaas; the server refreshes a pending row on read.
    refetchInterval: (query) => (query.state.data?.status === 'PENDING_APPROVAL' ? 30_000 : false),
  });
}
