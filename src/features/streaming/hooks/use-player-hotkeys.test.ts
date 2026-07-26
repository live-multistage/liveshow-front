import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerHotkeys, clampVolume, VOLUME_STEP } from './use-player-hotkeys';

function makeHandlers() {
  return {
    onToggleFullscreen: vi.fn(),
    onToggleCameraPanel: vi.fn(),
    onToggleMute: vi.fn(),
    onVolumeUp: vi.fn(),
    onVolumeDown: vi.fn(),
  };
}

function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...init }));
}

describe('usePlayerHotkeys', () => {
  let h: ReturnType<typeof makeHandlers>;
  beforeEach(() => {
    h = makeHandlers();
    renderHook(() => usePlayerHotkeys(h));
  });

  it('maps f/c/m and arrows to their handlers', () => {
    press('f'); press('c'); press('m'); press('ArrowUp'); press('ArrowDown');
    expect(h.onToggleFullscreen).toHaveBeenCalledTimes(1);
    expect(h.onToggleCameraPanel).toHaveBeenCalledTimes(1);
    expect(h.onToggleMute).toHaveBeenCalledTimes(1);
    expect(h.onVolumeUp).toHaveBeenCalledTimes(1);
    expect(h.onVolumeDown).toHaveBeenCalledTimes(1);
  });

  it('accepts uppercase (shift/caps) variants', () => {
    press('F'); press('C'); press('M');
    expect(h.onToggleFullscreen).toHaveBeenCalledTimes(1);
    expect(h.onToggleCameraPanel).toHaveBeenCalledTimes(1);
    expect(h.onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('ignores keys pressed with a modifier', () => {
    press('f', { metaKey: true });
    press('m', { ctrlKey: true });
    expect(h.onToggleFullscreen).not.toHaveBeenCalled();
    expect(h.onToggleMute).not.toHaveBeenCalled();
  });

  it('ignores shortcuts while typing in an input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(h.onToggleMute).not.toHaveBeenCalled();
    input.remove();
  });
});

describe('clampVolume', () => {
  it('clamps to [0, 1]', () => {
    expect(clampVolume(1 + VOLUME_STEP)).toBe(1);
    expect(clampVolume(-VOLUME_STEP)).toBe(0);
    expect(clampVolume(0.5)).toBe(0.5);
  });
});
