'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { organizationLedgerKey } from './use-organization-ledger';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { OrganizationPayoutResult } from '../types/organization.types';

// Copy keys the caller maps with useTranslations('organizations') — kept
// here so the component and its tests share one source of truth for how a
// PayoutOrganizationLedgerUseCase error translates to user-facing copy.
export type WithdrawErrorReason = 'notReady' | 'insufficientBalance' | 'unexpected';

export function classifyWithdrawError(error: AppError): WithdrawErrorReason {
  if (error.status === 400 && error.message.includes('Stripe account')) return 'notReady';
  if (error.status === 400) return 'insufficientBalance';
  return 'unexpected';
}

export function useWithdrawLedgerBalance(orgId: string) {
  const qc = useQueryClient();

  return useMutation<OrganizationPayoutResult, AppError, void>({
    mutationFn: async () => {
      try {
        return await organizationService.withdrawLedgerBalance(orgId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: organizationLedgerKey(orgId) });
    },
  });
}
