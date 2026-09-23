vi.mock('../services/house-ads.service', () => ({
  houseAdsService: {
    list: vi.fn(),
    getReport: vi.fn(),
  },
}));

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHouseAdReportQuery, useHouseAdsQuery, houseAdsKeys } from './house-ads.queries';
import { houseAdsService } from '../services/house-ads.service';
import type { HouseAdListResult, HouseAdReport } from '../types/house-ads.types';

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('houseAdsKeys', () => {
  it('builds a stable, filter-scoped list key', () => {
    const filter = { page: 1, limit: 20 } as const;
    expect(houseAdsKeys.list(filter)).toEqual(['platform-admin', 'house-ads', 'list', filter]);
  });

  it('builds an id-scoped report key', () => {
    expect(houseAdsKeys.report('ad-1')).toEqual(['platform-admin', 'house-ads', 'report', 'ad-1']);
  });
});

describe('useHouseAdsQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the list with the given filter', async () => {
    const result: HouseAdListResult = { items: [], total: 0 };
    vi.mocked(houseAdsService.list).mockResolvedValue(result);

    const filter = { status: 'ACTIVE' as const, page: 1, limit: 20 };
    const { result: hookResult } = renderHook(() => useHouseAdsQuery(filter), { wrapper: wrapper() });

    await waitFor(() => expect(hookResult.current.isSuccess).toBe(true));
    expect(houseAdsService.list).toHaveBeenCalledWith(filter);
    expect(hookResult.current.data).toEqual(result);
  });
});

describe('useHouseAdReportQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays disabled when id is null', () => {
    const { result } = renderHook(() => useHouseAdReportQuery(null), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(houseAdsService.getReport).not.toHaveBeenCalled();
  });

  it('fetches the report once an id is provided', async () => {
    const report = { adId: 'ad-1' } as HouseAdReport;
    vi.mocked(houseAdsService.getReport).mockResolvedValue(report);

    const { result } = renderHook(() => useHouseAdReportQuery('ad-1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.getReport).toHaveBeenCalledWith('ad-1');
    expect(result.current.data).toEqual(report);
  });
});
