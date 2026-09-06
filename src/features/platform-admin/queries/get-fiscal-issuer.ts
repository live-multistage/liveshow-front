'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const FISCAL_ISSUER_KEY = ['platform-admin', 'fiscal', 'issuer'] as const;

export function useFiscalIssuerQuery() {
  return useQuery({
    queryKey: FISCAL_ISSUER_KEY,
    queryFn: platformAdminService.getFiscalIssuer,
    staleTime: 60_000,
  });
}
