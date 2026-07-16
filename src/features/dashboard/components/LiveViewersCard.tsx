'use client';

import { useLiveViewersQuery } from '@/features/platform-admin/queries/get-live-viewers';
import styles from './SuperAdminDashboard.module.scss';

function fmt(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`;
  return `${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
}

// Build a sparkline path (line + area) from the series over a 300×70 viewBox.
function sparkline(series: number[]): { line: string; area: string } | null {
  if (series.length < 2) return null;
  const W = 300, H = 70, pad = 6;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return { line, area };
}

// Realtime viewers card (design: "Espectadores agora"). Polls every 15s.
export function LiveViewersCard() {
  const { data, isLoading } = useLiveViewersQuery();
  const spark = data ? sparkline(data.series) : null;
  const deltaUp = (data?.perMinutePct ?? 0) >= 0;

  return (
    <div className={styles.viewersCard}>
      <div className={styles.viewersEyebrow}>VIEWER-TRACKING</div>
      <div className={styles.viewersTitle}>Espectadores agora</div>

      {isLoading ? (
        <div className={styles.viewersBig}>—</div>
      ) : (
        <div className={styles.viewersValueRow}>
          <span className={styles.viewersBig}>{fmt(data?.totalNow ?? 0)}</span>
          {!!data && data.totalNow > 0 && (
            <span className={deltaUp ? styles.viewersDeltaUp : styles.viewersDeltaDown}>
              {deltaUp ? '↑' : '↓'} {Math.abs(data.perMinutePct)}% /min
            </span>
          )}
        </div>
      )}

      {spark && (
        <svg viewBox="0 0 300 70" className={styles.sparkline} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lsvw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2e9e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff2e9e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={spark.area} fill="url(#lsvw)" />
          <path d={spark.line} fill="none" stroke="#ff2e9e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      )}

      <div className={styles.viewersList}>
        {data?.topEvents.length ? (
          data.topEvents.map((e) => (
            <div key={e.eventId} className={styles.viewersRow}>
              <span className={styles.viewersName}>{e.title}</span>
              <span className={styles.viewersCount}>{fmt(e.viewers)}</span>
            </div>
          ))
        ) : (
          !isLoading && <div className={styles.viewersEmpty}>Nenhuma transmissão ao vivo agora.</div>
        )}
      </div>
    </div>
  );
}
