'use client';

import type { CSSProperties } from 'react';
import styles from './SeekSlider.module.scss';

interface Props {
  // Replay starts at 0; live's DVR window starts wherever the sliding playlist
  // currently begins, so the track is NOT anchored at zero there.
  min?: number;
  max: number;
  value: number;
  onSeek: (time: number) => void;
  ariaLabel: string;
}

// The scrub track shared by ReplayTransportBar (VOD timeline) and TransportBar
// (live DVR window). Only the input is shared — each bar keeps its own labels
// and layout, since "0:00 / 3:42" and "-1:23 behind live" are different
// readings of the same control.
export function SeekSlider({ min = 0, max, value, onSeek, ariaLabel }: Props) {
  const span = max - min;
  const percent = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={0.1}
      value={Math.min(Math.max(value, min), max)}
      onChange={(e) => onSeek(Number(e.target.value))}
      className={styles.seekSlider}
      style={{ '--fill': `${percent}%` } as CSSProperties}
      aria-label={ariaLabel}
    />
  );
}
