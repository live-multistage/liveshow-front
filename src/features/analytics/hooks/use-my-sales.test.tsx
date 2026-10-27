import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/analytics.service', () => ({
  analyticsService: { getMySales: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { analyticsService } from '../services/analytics.service';
import type { SalesByCurrency, SalesGranularity } from '../types/sales.types';
import { useGetMySalesQuery } from './use-my-sales';

const getMySalesMock = analyticsService.getMySales as ReturnType<typeof vi.fn>;

const monthly: SalesByCurrency[] = [
  { currency: 'BRL', summary: { totalOrders: 9, totalRevenue: 900, data: [] }, byEvent: [] },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useGetMySalesQuery', () => {
  it('keeps the previous granularity on screen while the new one loads', async () => {
    getMySalesMock.mockResolvedValueOnce(monthly).mockReturnValueOnce(new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ granularity }: { granularity: SalesGranularity }) => useGetMySalesQuery(granularity),
      { wrapper, initialProps: { granularity: 'month' } },
    );
    await waitFor(() => expect(result.current.data).toEqual(monthly));

    rerender({ granularity: 'day' });

    expect(getMySalesMock).toHaveBeenLastCalledWith('day');
    expect(result.current.data).toEqual(monthly);
    expect(result.current.isPlaceholderData).toBe(true);
  });
});
