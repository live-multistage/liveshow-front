'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, Inbox } from 'lucide-react';
import { Button, Chip, Input, SimpleCustomSelect } from '@live-show/design-system';
import type { ExploreReport, ExploreRequest } from '@live-show/api-contracts';
import { useExploreReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import { DateRangeField } from './DateRangeField';
import { ReportLoadingSkeleton, ReportMessageState, TimeoutBanner } from './ReportStates';
import { defaultRange, formatDayOrHour, isRangeValid, isTimeoutError } from './report-utils';
import styles from './ReportsShared.module.scss';

// design chart palette maps onto the existing --chart-1..4 tokens
const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

export function ExploreTab() {
  const t = useTranslations('platformAdmin.tracking');
  const { data: plan } = useTrackingPlanQuery();
  const plannedEvents = useMemo(
    () => (plan ?? []).filter((e) => e.status === 'live' || e.status === 'deprecated').map((e) => e.name),
    [plan],
  );

  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [event, setEvent] = useState('');
  const [interval, setInterval] = useState<'hour' | 'day'>('day');
  const [breakdown, setBreakdown] = useState('');
  const [req, setReq] = useState<ExploreRequest | null>(null);

  const rangeValid = isRangeValid(from, to);
  const canRun = rangeValid && event !== '';

  const { data, isLoading, isError, error } = useExploreReportQuery(req);
  const timeout = isTimeoutError(error);

  function handleRun() {
    if (!canRun) return;
    setReq({ from, to, event, interval, breakdown: breakdown || undefined });
  }

  return (
    <>
      <div className={styles.queryBar}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.explore.event')}</span>
          <div className={styles.select}>
            <SimpleCustomSelect
              value={event}
              onValueChange={setEvent}
              options={plannedEvents.map((name) => ({ value: name, label: name }))}
            />
          </div>
        </div>
        <DateRangeField
          label={t('reports.period')}
          from={from}
          to={to}
          invalid={!rangeValid}
          errorText={t('reports.states.rangeTooLong')}
          onChange={(f, tt) => { setFrom(f); setTo(tt); }}
        />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.explore.interval')}</span>
          <div>
            <Chip variant={interval === 'hour' ? 'active' : 'default'} onClick={() => setInterval('hour')}>
              {t('reports.explore.intervalHour')}
            </Chip>{' '}
            <Chip variant={interval === 'day' ? 'active' : 'default'} onClick={() => setInterval('day')}>
              {t('reports.explore.intervalDay')}
            </Chip>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.explore.breakdown')}</span>
          <Input
            value={breakdown}
            onChange={(e) => setBreakdown(e.target.value)}
            placeholder={t('reports.explore.breakdownPrefix')}
          />
        </div>
        <div className={styles.runBar}>
          <Button onClick={handleRun} disabled={!canRun}>{t('reports.run')}</Button>
        </div>
      </div>

      {isLoading && <ReportLoadingSkeleton />}

      {!isLoading && timeout && (
        <>
          <TimeoutBanner text={t('reports.states.timeout')} />
          <ReportMessageState icon={<Inbox size={30} />} text={t('reports.states.timeoutEmpty')} />
        </>
      )}

      {!isLoading && !timeout && isError && (
        <ReportMessageState icon={<Inbox size={30} />} text={t('reports.explore.empty')} />
      )}

      {!isLoading && !timeout && !isError && !data && (
        <ReportMessageState icon={<BarChart3 size={30} />} text={t('reports.states.noQuery')} />
      )}

      {!isLoading && !timeout && data && (
        <ExploreResults report={data} interval={req?.interval ?? interval} />
      )}
    </>
  );
}

function ExploreResults({ report, interval }: { report: ExploreReport; interval: 'hour' | 'day' }) {
  const t = useTranslations('platformAdmin.tracking');

  if (report.series.length === 0 || report.series.every((s) => s.points.length === 0)) {
    return <ReportMessageState icon={<Inbox size={30} />} text={t('reports.explore.empty')} />;
  }

  const points = report.series[0].points;
  const max = Math.max(1, ...report.series.flatMap((s) => s.points.map((p) => p.count)));
  const width = 640;
  const height = 260;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeaderRow}>
          {report.series.map((s, i) => (
            <span
              key={s.key}
              className={`${styles.mono} ${styles.seriesLabel}`}
              style={{ '--series-color': SERIES_COLORS[i % SERIES_COLORS.length] } as CSSProperties}
            >
              {s.key} · {s.points.reduce((sum, p) => sum + p.count, 0)}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={t('reports.explore.title')}>
          {report.series.map((s, i) => {
            const linePoints = s.points
              .map((p, idx) => `${idx * stepX},${height - (p.count / max) * height}`)
              .join(' ');
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <g key={s.key}>
                {i === 0 && (
                  <polygon
                    className={styles.areaFill}
                    points={`0,${height} ${linePoints} ${(s.points.length - 1) * stepX},${height}`}
                  />
                )}
                <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} />
              </g>
            );
          })}
        </svg>
        <div className={styles.mono}>
          {points.map((p) => formatDayOrHour(p.at, interval)).join('   ')}
        </div>
      </div>

      <div className={`${styles.card} ${styles.tableScroll}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{interval === 'hour' ? t('reports.explore.columns.hour') : t('reports.explore.columns.day')}</th>
              {report.series.map((s) => <th key={s.key}>{s.key}</th>)}
              <th>{t('reports.explore.columns.total')}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, idx) => {
              const rowTotal = report.series.reduce((sum, s) => sum + (s.points[idx]?.count ?? 0), 0);
              return (
                <tr key={p.at}>
                  <td>{formatDayOrHour(p.at, interval)}</td>
                  {report.series.map((s) => <td key={s.key}>{s.points[idx]?.count ?? 0}</td>)}
                  <td className={styles.totalCell}>{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
