import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSetOverlayAdsMutation } from './set-overlay-ads.mutation';
import { eventsService } from '../services/events.service';
import { eventKeys } from '../queries/get-event';

vi.mock('../services/events.service', () => ({ eventsService: { setOverlayAds: vi.fn() } }));

const setOverlayAds = vi.mocked(eventsService.setOverlayAds);

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(eventKeys.detail('evt-1'), { id: 'evt-1', title: 'Show', overlayAds: { allowed: true, onReplay: true } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, ...renderHook(() => useSetOverlayAdsMutation('evt-1'), { wrapper }) };
}

describe('useSetOverlayAdsMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves and writes the new settings into the cached event, keeping the rest of it', async () => {
    setOverlayAds.mockResolvedValue({ overlayAds: { allowed: false, onReplay: true } });
    const { qc, result } = setup();

    await act(async () => { await result.current.mutateAsync({ allowed: false, onReplay: true }); });

    expect(setOverlayAds).toHaveBeenCalledWith('evt-1', { allowed: false, onReplay: true });
    expect(qc.getQueryData(eventKeys.detail('evt-1'))).toEqual({ id: 'evt-1', title: 'Show', overlayAds: { allowed: false, onReplay: true } });
  });

  it('leaves the cache alone when the request fails (the switch snaps back)', async () => {
    setOverlayAds.mockRejectedValue(new Error('403'));
    const { qc, result } = setup();

    await act(async () => { await result.current.mutateAsync({ allowed: false, onReplay: true }).catch(() => {}); });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(qc.getQueryData(eventKeys.detail('evt-1'))).toMatchObject({ overlayAds: { allowed: true, onReplay: true } });
  });
});
