import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerHotkeys, clampVolume, VOLUME_STEP } from './use-player-hotkeys';

function makeHandlers() {
  return {
    onToggleFullscreen: vi.fn(),
    onToggleCameraPanel: vi.fn(),
    onToggleMute: vi.fn(),
    onTogglePlay: vi.fn(),
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

  it('maps space to play/pause', () => {
    press(' ');
    expect(h.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('accepts the legacy Spacebar key name', () => {
    press('Spacebar');
    expect(h.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('stops space from scrolling the page', () => {
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('never types space into the chat', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(h.onTogglePlay).not.toHaveBeenCalled();
    input.remove();
  });

  /**
   * Space is the browser's activation key for a focused button. Swallowing it
   * would mean a keyboard user who tabs to "fullscreen" and hits space gets
   * play/pause instead — every control in the player silently broken.
   */
  it('leaves space alone when a control has focus', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    button.dispatchEvent(event);

    expect(h.onTogglePlay).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    button.remove();
  });

  it('leaves space alone for a custom role="button" control', () => {
    const div = document.createElement('div');
    div.setAttribute('role', 'button');
    document.body.appendChild(div);
    div.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(h.onTogglePlay).not.toHaveBeenCalled();
    div.remove();
  });
});

describe('clampVolume', () => {
  it('clamps to [0, 1]', () => {
    expect(clampVolume(1 + VOLUME_STEP)).toBe(1);
    expect(clampVolume(-VOLUME_STEP)).toBe(0);
    expect(clampVolume(0.5)).toBe(0.5);
  });
});
