import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLiveDvr } from './use-live-dvr';

const window = (hasFrame: boolean) => ({ start: 0, edge: 400, tolerance: 8, hasFrame });

describe('useLiveDvr — at-live badge', () => {
  it('is not "behind" while the panel waits for its first frame at position 0', () => {
    const { result } = renderHook(() => useLiveDvr('cam'));
    act(() => result.current.handleProgress(0, 406, window(false)));
    expect(result.current.dvr).not.toBeNull();
    expect(result.current.atLive).toBe(true);
  });

  it('measures the position once playback has begun', () => {
    const { result } = renderHook(() => useLiveDvr('cam'));
    act(() => result.current.handleProgress(300, 406, window(true)));
    expect(result.current.atLive).toBe(false);
  });

  it('a rebuffer after the start is still reported as behind', () => {
    const { result } = renderHook(() => useLiveDvr('cam'));
    act(() => result.current.handleProgress(399, 406, window(true)));
    expect(result.current.atLive).toBe(true);
    act(() => result.current.handleProgress(300, 406, window(false)));
    expect(result.current.atLive).toBe(false);
  });

  it('a new stage has to start again', () => {
    const { result } = renderHook(() => useLiveDvr('cam'));
    act(() => result.current.handleProgress(300, 406, window(true)));
    act(() => result.current.resetForStageChange());
    act(() => result.current.handleProgress(0, 406, window(false)));
    expect(result.current.atLive).toBe(true);
  });
});
