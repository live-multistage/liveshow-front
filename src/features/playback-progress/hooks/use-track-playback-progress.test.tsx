import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/playback-progress.service', () => ({
  playbackProgressService: { save: vi.fn().mockResolvedValue(undefined), list: vi.fn() },
}));

import { renderHook, act } from '@testing-library/react';
import { useTrackPlaybackProgress } from './use-track-playback-progress';
import { playbackProgressService } from '../services/playback-progress.service';

const save = vi.mocked(playbackProgressService.save);

beforeEach(() => {
  save.mockClear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

const setup = (enabled = true) =>
  renderHook(() => useTrackPlaybackProgress({ eventId: 'evt-1', enabled }));

describe('useTrackPlaybackProgress', () => {
  /**
   * O <video> dispara timeupdate ~4x por segundo. Sem throttle, o player
   * bombardearia a própria API.
   */
  it('reports at most once per interval, however often it is called', () => {
    const { result } = setup();

    act(() => {
      for (let t = 10; t < 40; t += 1) result.current.report(t, 600);
    });

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('sends the latest position, not the one that opened the window', () => {
    const { result } = setup();
    act(() => {
      result.current.report(10, 600);
      result.current.report(35, 600);
    });
    expect(save).toHaveBeenCalledWith({ eventId: 'evt-1', positionSeconds: 10, durationSeconds: 600 });

    act(() => {
      vi.advanceTimersByTime(11_000);
      result.current.report(120, 600);
    });
    expect(save).toHaveBeenLastCalledWith({ eventId: 'evt-1', positionSeconds: 120, durationSeconds: 600 });
  });

  it('ignores a position too small to be worth resuming', () => {
    const { result } = setup();
    act(() => result.current.report(2, 600));
    expect(save).not.toHaveBeenCalled();
  });

  it('does not report an unknown duration', () => {
    const { result } = setup();
    act(() => result.current.report(120, 0));
    expect(save).not.toHaveBeenCalled();
  });

  /** Sair do player é o momento mais provável de todos — não pode esperar o tick. */
  it('flushes the last position on unmount', () => {
    const { result, unmount } = setup();
    act(() => result.current.report(10, 600));
    save.mockClear();

    act(() => result.current.report(300, 600)); // dentro da janela: não envia
    expect(save).not.toHaveBeenCalled();

    unmount();

    expect(save).toHaveBeenCalledWith({ eventId: 'evt-1', positionSeconds: 300, durationSeconds: 600 });
  });

  it('flushes when the tab is hidden or backgrounded', () => {
    const { result } = setup();
    act(() => result.current.report(10, 600));
    save.mockClear();
    act(() => result.current.report(250, 600));

    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(save).toHaveBeenCalledWith({ eventId: 'evt-1', positionSeconds: 250, durationSeconds: 600 });
  });

  it('stays silent for a signed-out viewer', () => {
    const { result, unmount } = setup(false);
    act(() => result.current.report(300, 600));
    unmount();
    expect(save).not.toHaveBeenCalled();
  });
});
