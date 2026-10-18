import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, fireEvent } from '@testing-library/react';
import { usePlayerShell, type PlayerStreamLike } from './use-player-shell';
import type { LiveCamera } from '../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const cam: LiveCamera = {
  cameraId: 'a', name: 'Cam a', slug: 'a', priority: 1, manifestPath: '/a.m3u8', llPath: null, live: true, thumbnailUrl: null, coverage: [],
};

describe('usePlayerShell — one side drawer at a time', () => {
  it('opening chapters closes cameras, and opening cameras closes chapters', () => {
    const { result } = renderHook(() => usePlayerShell({ cameras: [cam] }));

    act(() => result.current.toggleCameraStrip());
    expect(result.current.cameraStripOpen).toBe(true);

    act(() => result.current.toggleChapters());
    expect(result.current.chaptersOpen).toBe(true);
    expect(result.current.cameraStripOpen).toBe(false);

    act(() => result.current.toggleCameraStrip());
    expect(result.current.cameraStripOpen).toBe(true);
    expect(result.current.chaptersOpen).toBe(false);
  });

  it('the camera hotkey also closes chapters', () => {
    const { result } = renderHook(() => usePlayerShell({ cameras: [cam] }));
    act(() => result.current.toggleChapters());

    act(() => { fireEvent.keyDown(window, { key: 'c' }); });

    expect(result.current.cameraStripOpen).toBe(true);
    expect(result.current.chaptersOpen).toBe(false);
  });
});

const camA: LiveCamera = { ...cam, cameraId: 'a1', name: 'Main' };
const camB: LiveCamera = { ...cam, cameraId: 'b1', name: 'Backstage' };
const stream = (id: string, position: number, c: LiveCamera): PlayerStreamLike<LiveCamera> => ({
  id,
  title: id,
  position,
  live: true,
  stages: [{ stageId: `st-${id}`, name: `Stage ${id}`, slug: id, position: 0, cameras: [c] }],
  cameras: [c],
  primaryCameraId: c.cameraId,
  librasCameraId: null,
});

describe('usePlayerShell — transmissions', () => {
  it('starts on the default stream and exposes only its stages and cameras', () => {
    const { result } = renderHook(() =>
      usePlayerShell({ cameras: [], streams: [stream('main', 0, camA), stream('vip', 1, camB)], defaultStreamId: 'vip' }),
    );

    expect(result.current.activeStreamId).toBe('vip');
    expect(result.current.stageCameras.map((c) => c.cameraId)).toEqual(['b1']);
    expect(result.current.activeCameraIds).toEqual(['b1']);
  });

  it('switching resets the stage and camera selection to the new stream', () => {
    const { result } = renderHook(() =>
      usePlayerShell({ cameras: [], streams: [stream('main', 0, camA), stream('vip', 1, camB)], defaultStreamId: 'main' }),
    );

    act(() => result.current.setActiveStreamId('vip'));

    expect(result.current.activeStageId).toBe('st-vip');
    expect(result.current.activeCameraIds).toEqual(['b1']);
  });

  it('a poll that moves defaultStreamId keeps the viewer on the stream they are watching', () => {
    const streams = [stream('main', 0, camA), stream('vip', 1, camB)];
    const { result, rerender } = renderHook(
      ({ def }: { def: string }) => usePlayerShell({ cameras: [], streams, defaultStreamId: def }),
      { initialProps: { def: 'main' } },
    );

    rerender({ def: 'vip' });

    expect(result.current.activeStreamId).toBe('main');
  });

  it('falls back to the default when the watched stream disappears', () => {
    const { result, rerender } = renderHook(
      ({ streams }: { streams: PlayerStreamLike<LiveCamera>[] }) =>
        usePlayerShell({ cameras: [], streams, defaultStreamId: 'main' }),
      { initialProps: { streams: [stream('main', 0, camA), stream('vip', 1, camB)] } },
    );
    act(() => result.current.setActiveStreamId('vip'));

    rerender({ streams: [stream('main', 0, camA)] });

    expect(result.current.activeStreamId).toBe('main');
    expect(result.current.activeCameraIds).toEqual(['a1']);
  });

  it('orders streams by position whatever order the payload uses', () => {
    const { result } = renderHook(() =>
      usePlayerShell({ cameras: [], streams: [stream('vip', 1, camB), stream('main', 0, camA)] }),
    );

    expect(result.current.streams.map((s) => s.id)).toEqual(['main', 'vip']);
  });

  it('without streams it plays the flattened cameras exactly as before', () => {
    const { result } = renderHook(() => usePlayerShell({ cameras: [cam] }));

    expect(result.current.streams).toEqual([]);
    expect(result.current.activeStreamId).toBeNull();
    expect(result.current.activeCameraIds).toEqual(['a']);
  });
});

describe('usePlayerShell — embedded preview', () => {
  it('hotkeysEnabled: false leaves the page keyboard alone', () => {
    const { result } = renderHook(() =>
      usePlayerShell({ cameras: [cam], initialAudio: { muted: true, volume: 1 }, hotkeysEnabled: false }),
    );

    fireEvent.keyDown(window, { key: 'm' });

    expect(result.current.audio.globalMuted).toBe(true);
  });
});
