import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/advertisements.service', () => ({
  advertisementsService: { serve: vi.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePrerollGate } from './use-preroll-gate';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

const serveMock = vi.mocked(advertisementsService.serve);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const videoAd: ServedAd = {
  servedId: 'srv-1',
  adId: 'ad-1',
  title: 'Video Ad',
  format: 'VIDEO',
  advertiserAccountId: 'acc-1',
  destination: null,
  bannerUrl: null,
  videoUrl: 'https://cdn.example.com/ad.mp4',
  videoDurationSec: 15,
};

const adWithoutVideo: ServedAd = {
  ...videoAd,
  adId: 'ad-2',
  videoUrl: null,
};

describe('usePrerollGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('serves a PRE_ROLL ad for an unseen event', async () => {
    serveMock.mockResolvedValue([videoAd]);
    const { result } = renderHook(() => usePrerollGate('ev1'), { wrapper });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.ad).toEqual(videoAd);
    expect(serveMock).toHaveBeenCalledWith('PRE_ROLL', 1, 'ev1');
  });

  it('returns null without fetching when already seen this session', () => {
    sessionStorage.setItem('preroll:ev1', '1');
    const { result } = renderHook(() => usePrerollGate('ev1'), { wrapper });
    expect(result.current.pending).toBe(false);
    expect(result.current.ad).toBeNull();
    expect(serveMock).not.toHaveBeenCalled();
  });

  it('markSeen persists the session flag', async () => {
    serveMock.mockResolvedValue([videoAd]);
    const { result } = renderHook(() => usePrerollGate('ev1'), { wrapper });
    await waitFor(() => expect(result.current.pending).toBe(false));

    act(() => {
      result.current.markSeen();
    });

    expect(sessionStorage.getItem('preroll:ev1')).toBe('1');
  });

  it('returns null ad on serve error', async () => {
    serveMock.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => usePrerollGate('ev1'), { wrapper });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.ad).toBeNull();
  });

  it('ignores served ads without videoUrl', async () => {
    serveMock.mockResolvedValue([adWithoutVideo]);
    const { result } = renderHook(() => usePrerollGate('ev1'), { wrapper });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.ad).toBeNull();
  });
});
