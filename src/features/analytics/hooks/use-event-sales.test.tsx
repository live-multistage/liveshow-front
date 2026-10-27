import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/analytics.service', () => ({
  analyticsService: { getEventSales: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { analyticsService } from '../services/analytics.service';
import type { EventSalesResult, SalesGranularity } from '../types/sales.types';
import { useGetEventSalesQuery } from './use-event-sales';

const getEventSalesMock = analyticsService.getEventSales as ReturnType<typeof vi.fn>;

const monthly: EventSalesResult = { events: [] };

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useGetEventSalesQuery', () => {
  it('refetches per granularity, keeping the previous rows meanwhile', async () => {
    getEventSalesMock.mockResolvedValueOnce(monthly).mockReturnValueOnce(new Promise(() => {}));

    const { result, rerender } = renderHook(
      ({ granularity }: { granularity: SalesGranularity }) => useGetEventSalesQuery(granularity),
      { wrapper, initialProps: { granularity: 'month' } },
    );
    await waitFor(() => expect(result.current.data).toBe(monthly));
    expect(getEventSalesMock).toHaveBeenLastCalledWith('month');

    rerender({ granularity: 'day' });

    expect(getEventSalesMock).toHaveBeenLastCalledWith('day');
    expect(result.current.data).toBe(monthly);
    expect(result.current.isPlaceholderData).toBe(true);
  });
});
