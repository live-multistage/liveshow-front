'use client';

import { useId, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { seriesClass, type SeriesColor } from './chart-series';
import {
  BOX,
  indexAtRatio,
  lineGeometry,
  sharedDomain,
  visibleLabelIndexes,
} from './line-chart-geometry';
import styles from './LineChart.module.scss';

export interface LineSeries {
  label: string;
  data: number[];
  color: SeriesColor;
  /** Gradient area under the line. Use on one series at most. */
  fill?: boolean;
  /** Dashed stroke, for a secondary reading laid over the main one. */
  dashed?: boolean;
}

interface Props {
  series: LineSeries[];
  /** One per sample, shared by every series. Thinned to fit under the plot. */
  labels: string[];
  formatValue?: (value: number) => string;
  /** Reported on hover, so a card header can show the value. */
  onActiveChange?: (index: number | null) => void;
  /** Hover box with every series' value. Off when the header already shows it. */
  tooltip?: boolean;
  emptyLabel?: string;
}

// Our own chart: SVG, no library. preserveAspectRatio="none" stretches the
// 0..100 drawing to any card width, and vector-effect="non-scaling-stroke"
// keeps the line 2px through that stretch. The dots, the hover rail and the
// tooltip are HTML on top, because SVG circles and text would stretch with the
// rest of the drawing.
export function LineChart({
  series,
  labels,
  formatValue = formatNumber,
  onActiveChange,
  tooltip = series.length > 1,
  emptyLabel = 'sem dados',
}: Props) {
  const idPrefix = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const count = Math.max(0, ...series.map((s) => s.data.length));
  if (count === 0) return <div className={styles.empty}>{emptyLabel}</div>;

  const domain = sharedDomain(series.map((s) => s.data));
  const drawn = series.flatMap((s) => {
    const geometry = lineGeometry(s.data, domain);
    return geometry ? [{ ...s, geometry }] : [];
  });
  const xs = drawn[0].geometry.points.map((p) => p.x);
  // With no hover the last sample is marked: it is the "now" of the series.
  const marked = activeIndex ?? count - 1;
  const markedX = xs[marked] ?? 0;

  const report = (index: number | null) => {
    setActiveIndex(index);
    onActiveChange?.(index);
  };

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    report(indexAtRatio((e.clientX - rect.left) / rect.width, count));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.plot} onPointerMove={handleMove} onPointerLeave={() => report(null)}>
        <svg className={styles.svg} viewBox={`0 0 ${BOX} ${BOX}`} preserveAspectRatio="none" aria-hidden>
          <line
            className={styles.baseline}
            x1="0"
            y1={BOX}
            x2={BOX}
            y2={BOX}
            vectorEffect="non-scaling-stroke"
          />
          {drawn.map((s, i) => {
            const gradientId = `${idPrefix}-g${i}`;
            return (
              <g key={s.label} className={seriesClass(s.color)}>
                {s.fill && (
                  <>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <path d={s.geometry.area} fill={`url(#${gradientId})`} />
                  </>
                )}
                <path
                  className={`${styles.line} ${s.dashed ? styles.dashed : ''}`}
                  d={s.geometry.line}
                  stroke="currentColor"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>

        {activeIndex !== null && <span className={styles.rail} style={{ left: `${markedX}%` }} />}
        {drawn.map((s) => {
          const point = s.geometry.points[marked];
          if (!point) return null;
          return (
            <span
              key={s.label}
              className={`${styles.dot} ${seriesClass(s.color)}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              data-testid="chart-dot"
            />
          );
        })}

        {tooltip && activeIndex !== null && (
          <div
            className={`${styles.tooltip} ${markedX > 60 ? styles.tooltipLeft : ''}`}
            style={{ left: `${markedX}%` }}
            role="status"
          >
            <span className={styles.tooltipTitle}>{labels[marked]}</span>
            {drawn.map((s) => (
              <span key={s.label} className={styles.tooltipRow}>
                <span className={`${styles.swatch} ${seriesClass(s.color)}`} aria-hidden />
                <span className={styles.tooltipLabel}>{s.label}</span>
                <span className={styles.tooltipValue}>{formatValue(s.data[marked] ?? 0)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.labels}>
        {visibleLabelIndexes(labels.length).map((i) => (
          <span
            key={i}
            className={[
              styles.label,
              // The ends align inward so they never spill past the card.
              i === 0 ? styles.labelStart : '',
              i === labels.length - 1 ? styles.labelEnd : '',
              i === marked ? styles.labelActive : '',
            ].join(' ')}
            style={{ left: `${xs[i] ?? 0}%` }}
          >
            {labels[i]}
          </span>
        ))}
      </div>

      {/* The numbers themselves, for screen readers: the drawing is aria-hidden. */}
      <ul className={styles.srOnly}>
        {drawn.map((s) => (
          <li key={s.label}>
            {s.label}: {s.data.map((v, i) => `${labels[i] ?? i} ${formatValue(v)}`).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}
