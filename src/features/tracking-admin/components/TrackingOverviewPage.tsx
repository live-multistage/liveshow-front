'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import type { OverviewReport } from '@live-show/api-contracts';
import { TrackingShell } from './TrackingShell';
import { useTrackingOverviewQuery } from '../queries/get-overview';
import styles from './TrackingOverviewPage.module.scss';

interface Props {
  trackingEnabled: boolean;
}

interface ViolationTier { color: string; border: string; pill: string }

// Tier thresholds are business logic (not a design token lookup); the
// resulting color is threaded into the DOM via a CSS custom property
// (--kpi-accent/--kpi-border), never as a static inline style.
function violationTier(rate: number): ViolationTier {
  if (rate < 0.01) return { color: '#4ade80', border: 'var(--muted)', pill: '< 1%' };
  if (rate < 0.05) return { color: '#facc15', border: 'rgba(234,179,8,.45)', pill: '1–5%' };
  return { color: '#f87171', border: 'rgba(248,113,113,.45)', pill: '> 5%' };
}

/**
 * Fills/truncates the backend's hourly points into exactly 24 UTC hour
 * slots ending at the current hour, so the chart never depends on the
 * backend returning exactly 24 points (single-point payloads, gaps, etc.).
 * Exported for tests; `now` defaults to real time in the component.
 */
export function normalizeHourly24(
  hourly: OverviewReport['hourly'],
  now: Date = new Date(),
): OverviewReport['hourly'] {
  const byHour = new Map(hourly.map((h) => [new Date(h.hour).toISOString(), h.count]));
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(end);
    d.setUTCHours(d.getUTCHours() - (23 - i));
    const iso = d.toISOString();
    return { hour: iso, count: byHour.get(iso) ?? 0 };
  });
}

/** Rounds up to a "nice" number (1/2/5 × 10^n) for axis ceilings. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  const norm = value / base;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * base;
}

/** 4-position integer axis (top → 0), deduped so small maxima don't repeat ticks. */
function niceTicks(maxValue: number, count = 4): number[] {
  const niceMax = niceCeil(maxValue);
  const step = niceMax / (count - 1);
  const ticks = Array.from({ length: count }, (_, i) => Math.round(niceMax - i * step));
  return Array.from(new Set(ticks));
}

export function TrackingOverviewPage({ trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const { data, isLoading, isError, refetch } = useTrackingOverviewQuery();

  const title = t('overview.title');
  const subtitle = t('overview.subtitle');
  const actions = (
    <>
      <span className={styles.rangeBadge}>{t('overview.last24h')}</span>
      <Link href="/dashboard/platform/tracking/debugger">
        <Button variant="outline">{t('overview.viewDebugger')}</Button>
      </Link>
    </>
  );

  if (isLoading) {
    return (
      <TrackingShell active="overview" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.grid4}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className={styles.kpiSkeleton} />)}
        </div>
        <Skeleton className={styles.chartSkeleton} />
      </TrackingShell>
    );
  }

  if (isError || !data) {
    return (
      <TrackingShell active="overview" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}><AlertCircle size={28} /></div>
          <p className={styles.stateTitle}>{t('overview.error')}</p>
          <Button variant="outline" onClick={() => refetch()}>{t('shell.retry')}</Button>
        </div>
      </TrackingShell>
    );
  }

  const bars = normalizeHourly24(data.hourly);
  const total = bars.reduce((sum, h) => sum + h.count, 0);
  const isEmpty = total === 0 && data.topEvents.length === 0;

  if (isEmpty) {
    return (
      <TrackingShell active="overview" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}><Inbox size={30} /></div>
          <p className={styles.stateTitle}>{t('overview.empty.title')}</p>
          <p className={styles.stateHint}>{t('overview.empty.body', { source: 'web' })}</p>
          <Link href="/dashboard/platform/tracking/sources" className={styles.emptyLink}>{t('overview.empty.cta')}</Link>
        </div>
      </TrackingShell>
    );
  }

  const avgValue = total / 24;
  const avgLabel = avgValue > 0 && avgValue < 10
    ? format.number(avgValue, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : format.number(Math.round(avgValue));
  const maxHour = Math.max(...bars.map((h) => h.count), 1);
  const peakIndex = bars.findIndex((h) => h.count === maxHour);
  const peakHour = bars[peakIndex];
  const violTier = violationTier(data.violationRate);
  const activeSources = data.sources.filter((s) => s.lastSeenAt);
  const mostRecent = activeSources
    .map((s) => s.lastSeenAt as string)
    .sort()
    .at(-1);
  const maxTopCount = Math.max(...data.topEvents.map((e) => e.count), 1);
  const yTicks = niceTicks(maxHour).map((v) => format.number(v));
  const queueBorder = data.queue.failed > 0 ? 'rgba(234,179,8,.45)' : 'var(--muted)';
  const queueSubColor = data.queue.failed > 0 ? '#facc15' : undefined;

  return (
    <TrackingShell active="overview" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
      <div className={trackingEnabled ? undefined : styles.dimmed}>
        <div className={styles.grid4}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('overview.kpis.events')}</div>
            <div className={styles.kpiValue}>{format.number(total)}</div>
            <div className={styles.kpiSub}>{t('overview.kpis.eventsSub', { avg: avgLabel })}</div>
          </div>
          <div className={styles.kpi} style={{ '--kpi-border': violTier.border } as CSSProperties}>
            <div className={styles.kpiLabel}>{t('overview.kpis.violationRate')}</div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue} style={{ '--kpi-accent': violTier.color } as CSSProperties}>
                {format.number(data.violationRate, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className={styles.pill} style={{ '--kpi-accent': violTier.color } as CSSProperties}>{violTier.pill}</span>
            </div>
            <div className={styles.kpiSub}>{t('overview.kpis.violationRateSub')}</div>
          </div>
          <div className={styles.kpi} style={{ '--kpi-border': queueBorder } as CSSProperties}>
            <div className={styles.kpiLabel}>{t('overview.kpis.queue')}</div>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{format.number(data.queue.waiting)}</span>
              {data.queue.failed > 0 && (
                <span className={styles.pillWarn}>{t('overview.kpis.queueFailedPill', { count: data.queue.failed })}</span>
              )}
            </div>
            <div className={styles.kpiSub} style={{ '--kpi-sub-color': queueSubColor } as CSSProperties}>
              {t('overview.kpis.queueSub', { failed: data.queue.failed })}
            </div>
          </div>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{t('overview.kpis.sources')}</div>
            <div className={styles.kpiValue}>{activeSources.length} / {data.sources.length}</div>
            <div className={styles.kpiSub}>
              {mostRecent ? t('overview.kpis.sourcesSub', { when: format.relativeTime(new Date(mostRecent), Date.now()) }) : t('overview.activeSources.never')}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitle}>{t('overview.chart.title')}</div>
            {peakHour && (
              <div className={styles.mono}>
                {t('overview.chart.peak')}{' '}
                <span className={styles.accent}>
                  {format.dateTime(new Date(peakHour.hour), { day: '2-digit', month: '2-digit' })}{' '}
                  {format.dateTime(new Date(peakHour.hour), { hour: '2-digit', hourCycle: 'h23' })}h · {t('overview.chart.peakCount', { count: format.number(peakHour.count) })}
                </span>
              </div>
            )}
          </div>
          <div className={styles.chartRow}>
            <div className={styles.yAxis}>
              {yTicks.map((tick, i) => <span key={i}>{tick}</span>)}
            </div>
            <div>
              <div className={styles.bars}>
                {bars.map((h, i) => (
                  <div
                    key={h.hour}
                    title={`${format.dateTime(new Date(h.hour), { day: '2-digit', month: '2-digit', hour: '2-digit', hourCycle: 'h23' })}h · ${format.number(h.count)}`}
                    className={i === bars.length - 1 ? `${styles.bar} ${styles.barNow}` : i === peakIndex ? `${styles.bar} ${styles.barPeak}` : styles.bar}
                    style={{ '--bar-height': `${Math.round((h.count / maxHour) * 1000) / 10}%` } as CSSProperties}
                  />
                ))}
              </div>
              <div className={styles.xLabels}>
                {bars.map((h, i) => (
                  <span key={h.hour} className={i === bars.length - 1 ? styles.xLabelNow : undefined}>
                    {i === bars.length - 1
                      ? t('overview.chart.now')
                      : i % 3 === 0
                        ? `${format.dateTime(new Date(h.hour), { hour: '2-digit', hourCycle: 'h23' })}h`
                        : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t('overview.topEvents.title')}</div>
              <div className={styles.mono}>{t('overview.topEvents.subtitle')}</div>
            </div>
            {data.topEvents.map((e) => (
              <div key={e.event} className={styles.topEventRow}>
                <div className={styles.topEventLine}>
                  <span className={styles.topEventName}>{e.event}</span>
                  <span className={styles.topEventCount}>{format.number(e.count)}</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ '--fill-width': `${Math.round((e.count / maxTopCount) * 100)}%` } as CSSProperties} />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardTitle}>{t('overview.activeSources.title')}</div>
              <Link href="/dashboard/platform/tracking/sources" className={styles.link}>{t('overview.activeSources.viewAll')}</Link>
            </div>
            {data.sources.map((s) => (
              <div key={s.id} className={styles.sourceRow}>
                <span className={styles.sourceName}>{s.name}</span>
                <span className={styles.mono}>
                  {s.lastSeenAt
                    ? t('overview.activeSources.lastSeen', { when: format.relativeTime(new Date(s.lastSeenAt), Date.now()) })
                    : t('overview.activeSources.never')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TrackingShell>
  );
}
