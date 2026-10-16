import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/checkout.service', () => ({
  checkoutService: { getOrder: vi.fn() },
}));

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { checkoutService } from '../services/checkout.service';
import { ORDER_POLL_INTERVAL_MS, ORDER_POLL_WINDOW_MS, useOrderQuery } from './checkout.mutations';
import type { OrderView } from '../types/checkout.types';

const getOrder = vi.mocked(checkoutService.getOrder);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('useOrderQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getOrder.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('polls a PENDING order, then stops and says so once the window closes', async () => {
    getOrder.mockResolvedValue({ id: 'o1', status: 'PENDING' } as OrderView);
    const { result } = renderHook(() => useOrderQuery('o1'), { wrapper });

    await tick(0);
    await tick(ORDER_POLL_INTERVAL_MS);
    expect(getOrder.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.current.pollingExpired).toBe(false);

    await tick(ORDER_POLL_WINDOW_MS);
    expect(result.current.pollingExpired).toBe(true);
    const callsAtExpiry = getOrder.mock.calls.length;

    await tick(ORDER_POLL_INTERVAL_MS * 10);
    expect(getOrder.mock.calls.length).toBe(callsAtExpiry);
  });

  it('stops polling as soon as the order leaves PENDING', async () => {
    getOrder.mockResolvedValue({ id: 'o1', status: 'PAID' } as OrderView);
    renderHook(() => useOrderQuery('o1'), { wrapper });

    await tick(0);
    await tick(ORDER_POLL_INTERVAL_MS * 5);
    expect(getOrder).toHaveBeenCalledTimes(1);
  });
});
