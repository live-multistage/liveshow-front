import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollGesture, SCROLL_GESTURE_THRESHOLD } from './use-scroll-gesture';

function wheel(el: HTMLElement, deltaY: number, timeStamp = 0) {
  const e = new WheelEvent('wheel', { deltaY });
  Object.defineProperty(e, 'timeStamp', { value: timeStamp });
  el.dispatchEvent(e);
}

describe('useScrollGesture', () => {
  let el: HTMLDivElement;
  let ref: { current: HTMLDivElement | null };
  let onDown: ReturnType<typeof vi.fn<() => void>>;
  let onUp: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    el = document.createElement('div');
    ref = { current: el };
    onDown = vi.fn<() => void>();
    onUp = vi.fn<() => void>();
  });

  it('fires onDown once the accumulated wheel delta passes the threshold', () => {
    renderHook(() => useScrollGesture(ref, { enabled: true, onDown, onUp }));
    wheel(el, SCROLL_GESTURE_THRESHOLD / 2, 0);
    expect(onDown).not.toHaveBeenCalled();
    wheel(el, SCROLL_GESTURE_THRESHOLD / 2, 100);
    expect(onDown).toHaveBeenCalledTimes(1);
  });

  it('fires onUp on upward scroll past the threshold', () => {
    renderHook(() => useScrollGesture(ref, { enabled: true, onDown, onUp }));
    wheel(el, -SCROLL_GESTURE_THRESHOLD, 0);
    expect(onUp).toHaveBeenCalledTimes(1);
    expect(onDown).not.toHaveBeenCalled();
  });

  it('does not accumulate deltas across the reset window', () => {
    renderHook(() => useScrollGesture(ref, { enabled: true, onDown, onUp }));
    wheel(el, SCROLL_GESTURE_THRESHOLD - 1, 0);
    wheel(el, 2, 5000); // long pause — separate gesture, restarts from zero
    expect(onDown).not.toHaveBeenCalled();
  });

  it('resets accumulation after firing (no double-fire on one long scroll)', () => {
    renderHook(() => useScrollGesture(ref, { enabled: true, onDown, onUp }));
    wheel(el, SCROLL_GESTURE_THRESHOLD, 0);
    wheel(el, SCROLL_GESTURE_THRESHOLD - 1, 50);
    expect(onDown).toHaveBeenCalledTimes(1);
  });

  it('is inert when disabled', () => {
    renderHook(() => useScrollGesture(ref, { enabled: false, onDown, onUp }));
    wheel(el, SCROLL_GESTURE_THRESHOLD * 2, 0);
    expect(onDown).not.toHaveBeenCalled();
  });

  it('handles touch swipe up as onDown', () => {
    renderHook(() => useScrollGesture(ref, { enabled: true, onDown, onUp }));
    const touch = (type: string, clientY: number, timeStamp: number) => {
      const e = new Event(type) as TouchEvent;
      Object.defineProperty(e, 'touches', { value: [{ clientY }] });
      Object.defineProperty(e, 'timeStamp', { value: timeStamp });
      el.dispatchEvent(e);
    };
    touch('touchstart', 300, 0);
    touch('touchmove', 300 - SCROLL_GESTURE_THRESHOLD, 50);
    expect(onDown).toHaveBeenCalledTimes(1);
  });
});
