'use client';

import { useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { chapterAt } from '@live-show/api-contracts';
import type { ReplayChapter } from '../../types/live.types';
import { chapterTrackSegments, formatClock, pointerToMs } from '../../utils/chapter-track';
import styles from './ChapterTrack.module.scss';

interface Props {
  // visibleChapters() output for the stage on screen.
  chapters: ReplayChapter[];
  min: number;
  max: number;
  value: number;
  // The native range (SeekSlider). It stays on top, transparent, so drag and
  // keyboard seeking work exactly as on the plain track.
  children: ReactNode;
}

export function ChapterTrack({ chapters, min, max: rawMax, value, children }: Props) {
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // The replay window end can be fractional; floor it so the last segment and
  // the max label stay stable.
  const max = Math.floor(rawMax);
  // Touch has no hover: the tooltip follows the thumb only while a finger drags it.
  const probeMs = hoverMs ?? (dragging ? value : null);

  const span = max - min;
  const pct = (ms: number) => `${span > 0 ? ((ms - min) / span) * 100 : 0}%`;
  const segments = chapterTrackSegments(chapters, { startsAtMs: min, endsAtMs: max }, value);
  const current = chapterAt(chapters, value);
  const probeChapter = probeMs === null ? null : chapterAt(chapters, probeMs);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    // A tap emits emulated pointer moves; hover is for mouse/pen only.
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverMs(pointerToMs(e.clientX, rect.left, rect.width, min, max));
  };

  return (
    <div
      className={styles.track}
      data-chapter-track=""
      data-dragging={dragging || undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverMs(null)}
      onTouchStart={() => setDragging(true)}
      onTouchEnd={() => setDragging(false)}
      onTouchCancel={() => setDragging(false)}
      style={{ '--pos': pct(value), '--probe': pct(probeMs ?? min) } as CSSProperties}
    >
      {current && <div className={styles.title}>{current.title}</div>}

      {segments.map((s) => (
        <div
          key={s.startsAtMs}
          className={styles.segment}
          data-kind={s.chapterId ? 'chapter' : 'gap'}
          data-last={s.last || undefined}
          data-hot={probeMs !== null && probeMs >= s.startsAtMs && probeMs < s.endsAtMs ? '' : undefined}
          style={{ '--left': `${s.leftPct}%`, '--width': `${s.widthPct}%`, '--fill': `${s.fillPct}%` } as CSSProperties}
        >
          <div className={styles.fill} />
        </div>
      ))}

      <div className={styles.knob} />

      {probeMs !== null && (
        <>
          <div className={styles.probeLine} />
          <div className={styles.tooltip} role="tooltip">
            <div className={styles.tooltipTime}>{formatClock(probeMs - min, span)}</div>
            {probeChapter && <div className={styles.tooltipTitle}>{probeChapter.title}</div>}
          </div>
        </>
      )}

      {children}
    </div>
  );
}
