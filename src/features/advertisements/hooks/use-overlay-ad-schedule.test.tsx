import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOverlayAdSchedule } from './use-overlay-ad-schedule';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

vi.mock('../services/advertisements.service', () => ({
  advertisementsService: { serveOverlay: vi.fn() },
}));

const serve = vi.mocked(advertisementsService.serveOverlay);

const ad: ServedAd = {
  servedId: 's1',
  adId: 'a1',
  title: 'Aurora',
  format: 'LOGO_4x1',
  advertiserAccountId: 'acc',
  destination: { type: 'EXTERNAL_URL', url: 'https://aurora.example' },
  bannerUrl: 'https://cdn/logo.png',
  videoUrl: null,
  videoDurationSec: null,
  pauseVariant: null,
  overlay: { position: 'TOP', animation: 'SLIDE', durationSec: 8 },
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  serve.mockReset().mockResolvedValue({ ad: null, retryAfterSec: 180 });
});
afterEach(() => vi.useRealTimers());

describe('useOverlayAdSchedule', () => {
  it('asks once on mount with watchedSec 0', async () => {
    renderHook(() => useOverlayAdSchedule('e1'));
    await flush();
    expect(serve).toHaveBeenCalledTimes(1);
    expect(serve).toHaveBeenCalledWith('e1', 0);
  });

  it('asks again exactly after retryAfterSec, sending the time watched so far', async () => {
    renderHook(() => useOverlayAdSchedule('e1'));
    await flush();

    await act(async () => { await vi.advanceTimersByTimeAsync(179_000); });
    expect(serve).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(serve).toHaveBeenCalledTimes(2);
    expect(serve).toHaveBeenLastCalledWith('e1', 180);
  });

  it('follows whatever retryAfterSec each answer brings', async () => {
    serve.mockResolvedValueOnce({ ad: null, retryAfterSec: 60 }).mockResolvedValueOnce({ ad: null, retryAfterSec: 3600 });
    renderHook(() => useOverlayAdSchedule('e1'));
    await flush();

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(serve).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(3_599_000); });
    expect(serve).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(serve).toHaveBeenCalledTimes(3);
  });

  it('exposes the served ad until it is dismissed', async () => {
    serve.mockResolvedValueOnce({ ad, retryAfterSec: 600 });
    const { result } = renderHook(() => useOverlayAdSchedule('e1'));
    await flush();

    expect(result.current.ad).toEqual(ad);
    act(() => result.current.dismiss());
    expect(result.current.ad).toBeNull();
  });

  it('keeps the schedule going while the ad is on screen (next ask is retryAfterSec after the answer)', async () => {
    serve.mockResolvedValueOnce({ ad, retryAfterSec: 600 });
    renderHook(() => useOverlayAdSchedule('e1'));
    await flush();

    await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
    expect(serve).toHaveBeenCalledTimes(2);
  });

  it('never asks while disabled (ads off, preview, offline)', async () => {
    renderHook(() => useOverlayAdSchedule('e1', { enabled: false }));
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(3_600_000); });
    expect(serve).not.toHaveBeenCalled();
  });

  it('retries in an hour after a failed request instead of hammering the API', async () => {
    serve.mockRejectedValueOnce(new Error('boom'));
    renderHook(() => useOverlayAdSchedule('e1'));
    await flush();

    await act(async () => { await vi.advanceTimersByTimeAsync(3_599_000); });
    expect(serve).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(serve).toHaveBeenCalledTimes(2);
  });

  it('stops asking after unmount', async () => {
    const { unmount } = renderHook(() => useOverlayAdSchedule('e1'));
    await flush();
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(3_600_000); });
    expect(serve).toHaveBeenCalledTimes(1);
  });

  it('ignores an answer that arrives after unmount', async () => {
    let resolve!: (v: { ad: ServedAd; retryAfterSec: number }) => void;
    serve.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    const { result, unmount } = renderHook(() => useOverlayAdSchedule('e1'));
    unmount();
    await act(async () => { resolve({ ad, retryAfterSec: 600 }); });
    expect(result.current.ad).toBeNull();
  });
});
