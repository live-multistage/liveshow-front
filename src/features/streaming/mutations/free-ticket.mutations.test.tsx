import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/checkout/services/checkout.service', () => ({
  checkoutService: { claimFreeTicket: vi.fn().mockResolvedValue({ granted: true }) },
}));

import { useClaimFreeTicketMutation } from './free-ticket.mutations';

describe('useClaimFreeTicketMutation', () => {
  it('refreshes ownership and playback so the panel and the player see the new ticket at once', async () => {
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useClaimFreeTicketMutation('evt-1'), { wrapper });

    act(() => result.current.mutate('tp-free'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([
      ['events', 'my-tickets', 'evt-1'],
      ['live', 'playback', 'evt-1'],
      ['live', 'replay-playback', 'evt-1'],
    ]));
  });
});

describe('useClaimFreeTicketMutation — already owned', () => {
  it('treats ALREADY_OWNED as a refetch, not an error toast', async () => {
    const { toast } = await import('sonner');
    const { checkoutService } = await import('@/features/checkout/services/checkout.service');
    vi.mocked(checkoutService.claimFreeTicket).mockRejectedValueOnce(
      Object.assign(new Error('x'), { isAxiosError: true, response: { status: 409, data: { code: 'ALREADY_OWNED' } } }),
    );
    const qc = new QueryClient();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useClaimFreeTicketMutation('evt-1'), { wrapper });

    act(() => result.current.mutate('tp-free'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toContainEqual(['live', 'playback', 'evt-1']);
  });
});
