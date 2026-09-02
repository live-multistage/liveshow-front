import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from './use-fullscreen';

function setFullscreenElement(el: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => el,
  });
  document.dispatchEvent(new Event('fullscreenchange'));
}

describe('useFullscreen', () => {
  let container: HTMLDivElement;
  let ref: { current: HTMLDivElement | null };

  beforeEach(() => {
    container = document.createElement('div');
    container.requestFullscreen = vi.fn();
    document.exitFullscreen = vi.fn();
    ref = { current: container };
    setFullscreenElement(null);
  });

  it('starts not fullscreen', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('tracks fullscreenchange for the container element', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    act(() => setFullscreenElement(container));
    expect(result.current.isFullscreen).toBe(true);
    // Esc exit: browser clears fullscreenElement and fires the event.
    act(() => setFullscreenElement(null));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('ignores fullscreen on a different element', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    act(() => setFullscreenElement(document.createElement('video')));
    expect(result.current.isFullscreen).toBe(false);
  });

  it('toggle requests fullscreen when not in it, exits when in it', () => {
    const { result } = renderHook(() => useFullscreen(ref));
    act(() => result.current.toggleFullscreen());
    expect(container.requestFullscreen).toHaveBeenCalledTimes(1);

    act(() => setFullscreenElement(container));
    act(() => result.current.toggleFullscreen());
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });
});
