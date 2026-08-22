import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerAudio } from './use-player-audio';
import type { LiveCamera } from '../types/live.types';

const cameras: LiveCamera[] = [
  { cameraId: 'cam-1', name: 'Cam 1', slug: 'cam-1', priority: 0, manifestPath: null, llPath: null },
];

describe('usePlayerAudio', () => {
  it('does not fire onChange on mount, only on an actual mute/volume change', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      usePlayerAudio({ cameras, fallbackCameraId: 'cam-1', initialMuted: true, initialVolume: 0.4, onChange }),
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.setGlobalMuted(false));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ muted: false, volume: 0.4 });
  });
});
