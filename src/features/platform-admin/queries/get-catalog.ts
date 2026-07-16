'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export function useCatalogSummaryQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'catalog-summary'] as const,
    queryFn: platformAdminService.getCatalogSummary,
    staleTime: 60_000,
  });
}
