'use client';

import type { ReactNode } from 'react';
import { seriesClass, type SeriesColor } from './chart-series';
import styles from './ChartCard.module.scss';

interface Props {
  title: string;
  /** Legend dot. Omit for a card whose chart has its own legend. */
  color?: SeriesColor;
  /** Right-aligned note in the header (period, currency, count…). */
  aside?: ReactNode;
  /** Plot height in px. The canvas needs a sized box: Chart.js runs with
      maintainAspectRatio off, so without one it collapses or grows unbounded. */
  height?: number;
  children: ReactNode;
}

// The card every chart in the app sits in: surface, hairline border, mono
// uppercase title, sized plot area. Panels used to each rebuild this with
// their own hexes and radii.
export function ChartCard({ title, color, aside, height = 170, children }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {color && (
          <span className={`${styles.dot} ${seriesClass(color)}`} aria-hidden />
        )}
        <h3 className={styles.title}>{title}</h3>
        {aside && <span className={styles.aside}>{aside}</span>}
      </div>
      <div className={styles.plot} style={{ height }}>
        {children}
      </div>
    </div>
  );
}
