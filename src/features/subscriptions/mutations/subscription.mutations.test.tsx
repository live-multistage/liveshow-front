import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/subscription.service', () => ({
  subscriptionService: { cancel: vi.fn(), resume: vi.fn(), portal: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  useCancelSubscriptionMutation,
  usePortalMutation,
  useResumeSubscriptionMutation,
} from './subscription.mutations';
import { subscriptionService } from '../services/subscription.service';
import { subscriptionKeys } from '../queries/subscription.queries';

const mockedCancel = vi.mocked(subscriptionService.cancel);
const mockedResume = vi.mocked(subscriptionService.resume);
const mockedPortal = vi.mocked(subscriptionService.portal);

const SUBSCRIPTION = {
  id: 'sub-1',
  channel: { slug: 'canal', name: 'Canal', coverUrl: null },
  interval: 'MONTHLY' as const,
  status: 'ACTIVE' as const,
  currentPeriodEnd: '2026-09-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  priceCents: 2990,
  currency: 'BRL',
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useCancelSubscriptionMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the list on settle', async () => {
    mockedCancel.mockResolvedValue({ ...SUBSCRIPTION, cancelAtPeriodEnd: true });
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelSubscriptionMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedCancel).toHaveBeenCalledWith('sub-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subscriptionKeys.mine });
  });

  it('toasts on error', async () => {
    mockedCancel.mockRejectedValue(new Error('boom'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCancelSubscriptionMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('error');
  });
});

describe('useResumeSubscriptionMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the list on settle', async () => {
    mockedResume.mockResolvedValue(SUBSCRIPTION);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useResumeSubscriptionMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedResume).toHaveBeenCalledWith('sub-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subscriptionKeys.mine });
  });
});

describe('usePortalMutation', () => {
  const originalAssign = window.location.assign;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: originalAssign },
      writable: true,
    });
  });

  it('redirects to the returned billing portal url', async () => {
    mockedPortal.mockResolvedValue({ url: 'https://billing.stripe.com/session/abc' });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePortalMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(window.location.assign).toHaveBeenCalledWith('https://billing.stripe.com/session/abc');
  });

  it('shows a distinct toast on a 404 (no subscription to manage)', async () => {
    mockedPortal.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePortalMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('noSubscriptionToManage');
  });

  it('shows the generic toast on any other error', async () => {
    mockedPortal.mockRejectedValue(new Error('boom'));
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => usePortalMutation(), { wrapper });

    result.current.mutate('sub-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('error');
  });
});
