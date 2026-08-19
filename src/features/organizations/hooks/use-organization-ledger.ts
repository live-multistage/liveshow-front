'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';

export const organizationLedgerKey = (orgId: string) =>
  ['organizations', orgId, 'ledger'] as const;

export function useOrganizationLedger(orgId: string) {
  return useQuery({
    queryKey: organizationLedgerKey(orgId),
    queryFn: () => organizationService.getLedger(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
