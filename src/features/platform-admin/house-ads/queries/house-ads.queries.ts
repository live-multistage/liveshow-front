'use client';

import { useQuery } from '@tanstack/react-query';
import { houseAdsService } from '../services/house-ads.service';
import type { HouseAdListFilter } from '../types/house-ads.types';

export const houseAdsKeys = {
  all: ['platform-admin', 'house-ads'] as const,
  list: (filter: HouseAdListFilter) => [...houseAdsKeys.all, 'list', filter] as const,
  report: (id: string) => [...houseAdsKeys.all, 'report', id] as const,
};

export function useHouseAdsQuery(filter: HouseAdListFilter) {
  return useQuery({
    queryKey: houseAdsKeys.list(filter),
    queryFn: () => houseAdsService.list(filter),
    staleTime: 30_000,
  });
}

export function useHouseAdReportQuery(id: string | null) {
  return useQuery({
    queryKey: houseAdsKeys.report(id ?? 'none'),
    queryFn: () => houseAdsService.getReport(id as string),
    enabled: id !== null,
    staleTime: 15_000,
  });
}
