'use client';

import { useId, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { seriesClass, type SeriesColor } from './chart-series';
import { BOX, indexAtRatio, sparklineGeometry } from './sparkline-path';
import styles from './Sparkline.module.scss';

interface Props {
  data: number[];
  /** One per sample. Shown under the plot. */
  labels: string[];
  color: SeriesColor;
  /** Formats the hovered/last value. Default: plain pt-BR number. */
  formatValue?: (value: number) => string;
  /** Reported on hover so the card header can show the value. */
  onActiveChange?: (active: { index: number; value: number } | null) => void;
  emptyLabel?: string;
}

// Our own chart: an SVG area, no library. preserveAspectRatio="none" lets the
// curve stretch to any card width from a fixed 0..100 box, and
// vector-effect="non-scaling-stroke" keeps the line 2px through that stretch.
// The dot and the hover rail are HTML on top, because a <circle> would stretch
// into an ellipse with the rest of the drawing.
export function Sparkline({
  data,
  labels,
  color,
  formatValue,
  onActiveChange,
  emptyLabel = 'sem dados',
}: Props) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const geometry = sparklineGeometry(data);

  if (!geometry) return <div className={styles.empty}>{emptyLabel}</div>;

  const { line, area, points } = geometry;
  const marked = activeIndex ?? points.length - 1;

  const report = (index: number | null) => {
    setActiveIndex(index);
    onActiveChange?.(index === null ? null : { index, value: data[index] });
  };

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    report(indexAtRatio((e.clientX - rect.left) / rect.width, data.length));
  };

  return (
    <div className={`${styles.wrap} ${seriesClass(color)}`}>
      <div
        className={styles.plot}
        onPointerMove={handleMove}
        onPointerLeave={() => report(null)}
      >
        <svg
          className={styles.svg}
          viewBox={`0 0 ${BOX} ${BOX}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            className={styles.line}
            d={line}
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
          />
          <line
            className={styles.baseline}
            x1="0"
            y1={BOX}
            x2={BOX}
            y2={BOX}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {activeIndex !== null && (
          <span className={styles.rail} style={{ left: `${points[marked].x}%` }} />
        )}
        <span
          className={styles.dot}
          style={{
            left: `${points[marked].x}%`,
            top: `${points[marked].y}%`,
          }}
          data-testid="sparkline-dot"
        />
      </div>

      <div className={styles.labels}>
        {labels.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={`${styles.label} ${i === marked ? styles.labelActive : ''}`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* The numbers themselves, for screen readers and for anyone who cannot
          hover: the drawing above is aria-hidden. */}
      <span className={styles.srOnly}>
        {data
          .map((value, i) => `${labels[i] ?? i}: ${(formatValue ?? fmt)(value)}`)
          .join(', ')}
      </span>
    </div>
  );
}

function fmt(value: number): string {
  return value.toLocaleString('pt-BR');
}
