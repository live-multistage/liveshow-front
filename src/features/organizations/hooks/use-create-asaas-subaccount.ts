'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { asaasSubaccountKey } from './use-asaas-subaccount';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { AsaasSubaccountResponse, CreateAsaasSubaccountRequest } from '@live-show/api-contracts';

export function useCreateAsaasSubaccount(orgId: string) {
  const qc = useQueryClient();
  return useMutation<AsaasSubaccountResponse, AppError, CreateAsaasSubaccountRequest>({
    mutationFn: async (body) => {
      try {
        return await organizationService.createAsaasSubaccount(orgId, body);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(asaasSubaccountKey(orgId), data);
    },
  });
}
