'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './ScrollWheelPicker.module.scss';

const ROW_HEIGHT = 40;

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}

// iOS-style scroll wheel: a scroll-snap list with one row of invisible
// padding above/below so the first and last real values can still land in
// the centered (selected) slot. Scrolling settles on the nearest row via
// native scroll-snap; this only needs to read back which index that landed
// on, via the browser's 'scrollend' event (with a debounced 'scroll'
// fallback for engines that don't support it yet).
export function ScrollWheelPicker({ value, min, max, onChange, ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // Known limitation: if a user interrupts an in-flight programmatic smooth
  // scroll (e.g. grabs the wheel right after clicking a row) before it settles,
  // that interruption's real end position can still be misread as the
  // programmatic scroll's own settle and get swallowed. No native browser
  // signal distinguishes "still finishing my own smooth-scroll" from "user
  // grabbed it mid-animation" — accepted as a rare, low-consequence edge case
  // (the next scroll interaction self-corrects it).
  const isProgrammaticScroll = useRef(false);

  const scrollToValue = useCallback((v: number, smooth: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const index = v - min;
    const target = index * ROW_HEIGHT;
    if (container.scrollTop === target) return;
    isProgrammaticScroll.current = true;
    container.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' });
  }, [min]);

  // Sync scroll position to `value` once, on mount — this component is
  // freshly mounted every time its parent Popover opens (Radix unmounts
  // closed content by default), so a mount-time sync is sufficient; there's
  // no need to react to `value` changing after that.
  useEffect(() => {
    scrollToValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollEnd = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const index = Math.round(container.scrollTop / ROW_HEIGHT);
    const clamped = Math.min(values.length - 1, Math.max(0, index));
    const next = min + clamped;
    if (next !== value) onChange(next);
  }, [min, value, values.length, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timeout: ReturnType<typeof setTimeout>;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handleScrollEnd();
    };

    const onScroll = () => {
      settled = false;
      clearTimeout(timeout);
      timeout = setTimeout(settle, 120);
    };

    container.addEventListener('scrollend', settle);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      container.removeEventListener('scrollend', settle);
      container.removeEventListener('scroll', onScroll);
    };
  }, [handleScrollEnd]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowUp' && value > min) {
      e.preventDefault();
      onChange(value - 1);
      scrollToValue(value - 1, true);
    } else if (e.key === 'ArrowDown' && value < max) {
      e.preventDefault();
      onChange(value + 1);
      scrollToValue(value + 1, true);
    }
  }

  return (
    <div
      ref={containerRef}
      className={styles.wheel}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.pad} aria-hidden />
      {values.map((v) => (
        <div
          key={v}
          role="option"
          aria-selected={v === value}
          className={`${styles.row} ${v === value ? styles.rowSelected : ''}`}
          onClick={() => { onChange(v); scrollToValue(v, true); }}
        >
          {String(v).padStart(2, '0')}
        </div>
      ))}
      <div className={styles.pad} aria-hidden />
    </div>
  );
}
