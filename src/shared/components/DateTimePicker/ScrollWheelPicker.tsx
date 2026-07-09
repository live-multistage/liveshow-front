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
  const isProgrammaticScroll = useRef(false);

  const scrollToValue = useCallback((v: number, smooth: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const index = v - min;
    isProgrammaticScroll.current = true;
    container.scrollTo({ top: index * ROW_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
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
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleScrollEnd, 120);
    };
    container.addEventListener('scrollend', handleScrollEnd);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      container.removeEventListener('scrollend', handleScrollEnd);
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
