import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, fireEvent } from '@testing-library/react';
import { usePlayerShell } from './use-player-shell';
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
