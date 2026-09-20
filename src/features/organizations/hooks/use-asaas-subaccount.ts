'use client';

import { useQuery, type Query } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import type { AsaasSubaccountResponse } from '@live-show/api-contracts';

export const asaasSubaccountKey = (orgId: string) =>
  ['organizations', orgId, 'asaas'] as const;

// Approval happens in Asaas; the server refreshes a pending row on read.
// Extracted so the polling decision is unit-testable without a real timer.
export function asaasSubaccountRefetchInterval(
  query: Query<AsaasSubaccountResponse | null>,
): number | false {
  return query.state.data?.status === 'PENDING_APPROVAL' ? 30_000 : false;
}

export function useAsaasSubaccount(orgId: string) {
  return useQuery({
    queryKey: asaasSubaccountKey(orgId),
    queryFn: () => organizationService.getAsaasSubaccount(orgId),
    enabled: !!orgId,
    refetchInterval: asaasSubaccountRefetchInterval,
  });
}
