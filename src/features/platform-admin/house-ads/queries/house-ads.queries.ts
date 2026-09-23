'use client';

import { useQuery } from '@tanstack/react-query';
import { houseAdsService } from '../services/house-ads.service';
import type { HouseAdListFilter } from '../types/house-ads.types';

export const houseAdsKeys = {
  all: ['platform-admin', 'house-ads'] as const,
  list: (filter: HouseAdListFilter) => [...houseAdsKeys.all, 'list', filter] as const,
  detail: (id: string) => [...houseAdsKeys.all, 'detail', id] as const,
  report: (id: string) => [...houseAdsKeys.all, 'report', id] as const,
};

export function useHouseAdsQuery(filter: HouseAdListFilter, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: houseAdsKeys.list(filter),
    queryFn: () => houseAdsService.list(filter),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
}

export function useHouseAdQuery(id: string | null) {
  return useQuery({
    queryKey: houseAdsKeys.detail(id ?? 'none'),
    queryFn: () => houseAdsService.getDetail(id as string),
    enabled: id !== null,
    staleTime: 15_000,
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
