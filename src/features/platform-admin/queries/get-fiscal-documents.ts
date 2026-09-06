'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import type { FiscalDocumentStatus } from '../types/platform-admin.types';

export interface FiscalDocumentsParams {
  status?: FiscalDocumentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useFiscalDocumentsQuery(params: FiscalDocumentsParams) {
  return useQuery({
    queryKey: ['platform-admin', 'fiscal', 'documents', params] as const,
    queryFn: () => platformAdminService.listFiscalDocuments(params),
    staleTime: 15_000,
  });
}
