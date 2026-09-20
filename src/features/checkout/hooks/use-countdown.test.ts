import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './use-countdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-19T15:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('formats the remaining time as mm:ss and is not expired', () => {
    const { result } = renderHook(() => useCountdown('2026-09-19T15:10:00.000Z'));
    expect(result.current.label).toBe('10:00');
    expect(result.current.isExpired).toBe(false);
  });

  it('recomputes from expiresAt every second without drifting', () => {
    const { result } = renderHook(() => useCountdown('2026-09-19T15:10:00.000Z'));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.label).toBe('09:00');
  });

  it('flips to expired once the target time passes', () => {
    const { result } = renderHook(() => useCountdown('2026-09-19T15:10:00.000Z'));
    act(() => { vi.advanceTimersByTime(10 * 60 * 1000); });
    expect(result.current.isExpired).toBe(true);
  });

  it('is a no-op, never-expired placeholder when there is no target yet', () => {
    const { result } = renderHook(() => useCountdown(undefined));
    expect(result.current).toEqual({ label: '00:00', isExpired: false });
  });
});
