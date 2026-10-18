import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerAudio } from './use-player-audio';
import type { LiveCamera } from '../types/live.types';

const cameras: LiveCamera[] = [
  { cameraId: 'cam-1', name: 'Cam 1', slug: 'cam-1', priority: 0, manifestPath: null, llPath: null, live: false },
];

const withTracks = (cameraId: string, languages: string[]): LiveCamera => ({
  cameraId, name: cameraId, slug: cameraId, priority: 0, manifestPath: null, llPath: null, live: true,
  audioTracks: languages.map((language, index) => ({ index, language, label: null, default: index === 0 })),
});

beforeEach(() => {
  localStorage.clear();
});

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

describe('usePlayerAudio — audio language', () => {
  it('plays the default track until the viewer picks a language', () => {
    const { result } = renderHook(() =>
      usePlayerAudio({ cameras: [withTracks('a', ['por', 'eng'])], fallbackCameraId: 'a' }),
    );
    expect(result.current.audioTracks).toHaveLength(2);
    expect(result.current.effectiveAudioTrackIndex).toBe(0);

    act(() => result.current.handleAudioLanguageChange('eng'));
    expect(result.current.effectiveAudioTrackIndex).toBe(1);
  });

  it('keeps the choice across a camera switch, falling back to default where the language is missing', () => {
    const list = [withTracks('a', ['por', 'eng']), withTracks('b', ['por', 'spa', 'eng']), withTracks('c', ['por', 'spa'])];
    const { result, rerender } = renderHook(({ fallback }) => usePlayerAudio({ cameras: list, fallbackCameraId: fallback }), {
      initialProps: { fallback: 'a' },
    });
    act(() => result.current.handleAudioLanguageChange('eng'));

    rerender({ fallback: 'b' });
    expect(result.current.effectiveAudioTrackIndex).toBe(2);

    rerender({ fallback: 'c' });
    expect(result.current.effectiveAudioTrackIndex).toBe(0);
    expect(result.current.preferredLanguage).toBe('eng');

    rerender({ fallback: 'a' });
    expect(result.current.effectiveAudioTrackIndex).toBe(1);
  });

  it('remembers the language for the next visit', () => {
    const first = renderHook(() => usePlayerAudio({ cameras: [withTracks('a', ['por', 'eng'])], fallbackCameraId: 'a' }));
    act(() => first.result.current.handleAudioLanguageChange('eng'));
    first.unmount();

    const second = renderHook(() => usePlayerAudio({ cameras: [withTracks('a', ['por', 'eng'])], fallbackCameraId: 'a' }));
    expect(second.result.current.effectiveAudioTrackIndex).toBe(1);
  });

  it('still switches when storage is unavailable (private mode)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const { result } = renderHook(() => usePlayerAudio({ cameras: [withTracks('a', ['por', 'eng'])], fallbackCameraId: 'a' }));

    act(() => result.current.handleAudioLanguageChange('eng'));
    expect(result.current.effectiveAudioTrackIndex).toBe(1);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
