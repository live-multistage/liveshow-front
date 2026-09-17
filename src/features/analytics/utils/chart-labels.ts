'use client';

/**
 * Axis labels for a views time series.
 *
 * The backend returns each bucket as an ISO instant. Rendering only the hour is
 * what made a multi-day series look like the clock ran backwards — 03h, 16h,
 * 23h, 17h are four different days, not a shuffled axis. So the date appears
 * whenever the series actually spans more than one day, and is left out when it
 * does not, which keeps a single-evening chart readable.
 */
export function chartLabels(points: { at: string }[]): string[] {
  const days = new Set(points.map((p) => new Date(p.at).toDateString()));
  const multiDay = days.size > 1;
  return points.map((p) => formatChartInstant(p.at, multiDay));
}

/** One bucket, in the viewer's own timezone. */
export function formatChartInstant(iso: string, withDate = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (!withDate) return time;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${time}`;
}
