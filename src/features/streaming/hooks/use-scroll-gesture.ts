'use client';

import { useEffect, useRef, type RefObject } from 'react';

interface ScrollGestureOptions {
  enabled: boolean;
  // Wheel/swipe downward past the threshold (YouTube-fullscreen style "pull up
  // the feed" gesture).
  onDown: () => void;
  // Wheel/swipe upward past the threshold.
  onUp: () => void;
}

// Accumulated deltaY before a gesture fires. High enough that a grazing
// trackpad touch doesn't open the panel mid-broadcast.
export const SCROLL_GESTURE_THRESHOLD = 80;
// Accumulation window: deltas further apart than this are separate gestures.
const RESET_MS = 400;

// Only meaningful inside fullscreen, where there is no page scroll competing
// for the wheel — callers gate with `enabled`.
export function useScrollGesture(
  targetRef: RefObject<HTMLElement | null>,
  { enabled, onDown, onUp }: ScrollGestureOptions,
) {
  // Live callbacks in a ref so the listeners bind once per enable-cycle.
  const cbRef = useRef({ onDown, onUp });
  cbRef.current = { onDown, onUp };

  useEffect(() => {
    const el = targetRef.current;
    if (!enabled || !el) return;

    let acc = 0;
    let lastAt = 0;
    const fire = (delta: number, at: number) => {
      if (at - lastAt > RESET_MS) acc = 0;
      lastAt = at;
      acc += delta;
      if (acc >= SCROLL_GESTURE_THRESHOLD) {
        acc = 0;
        cbRef.current.onDown();
      } else if (acc <= -SCROLL_GESTURE_THRESHOLD) {
        acc = 0;
        cbRef.current.onUp();
      }
    };

    const onWheel = (e: WheelEvent) => fire(e.deltaY, e.timeStamp);

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY === null || y === undefined) return;
      // Finger moving up = content pulled down = "down" gesture (same mapping
      // as wheel deltaY).
      fire(touchY - y, e.timeStamp);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, targetRef]);
}
