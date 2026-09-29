'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Inbox, LayoutGrid } from 'lucide-react';
import { Button, Input, SimpleCustomSelect } from '@live-show/design-system';
import type { RetentionReport, RetentionRequest } from '@live-show/api-contracts';
import { useRetentionReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import { DateRangeField } from './DateRangeField';
import { ReportLoadingSkeleton, ReportMessageState, TimeoutBanner } from './ReportStates';
import { defaultRange, formatCohortWeek, isRangeValid, isTimeoutError } from './report-utils';
import styles from './ReportsShared.module.scss';

export function RetentionTab() {
  const t = useTranslations('platformAdmin.tracking');
  const { data: plan } = useTrackingPlanQuery();
  const plannedEvents = useMemo(
    () => (plan ?? []).filter((e) => e.status === 'live' || e.status === 'deprecated').map((e) => e.name),
    [plan],
  );

  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [startEvent, setStartEvent] = useState('');
  const [returnEvent, setReturnEvent] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [req, setReq] = useState<RetentionRequest | null>(null);

  const rangeValid = isRangeValid(from, to);
  const weeksValid = weeks >= 1 && weeks <= 12;
  const canRun = rangeValid && weeksValid && startEvent !== '' && returnEvent !== '';

  const { data, isLoading, isError, error } = useRetentionReportQuery(req);
  const timeout = isTimeoutError(error);

  function handleRun() {
    if (!canRun) return;
    setReq({ from, to, startEvent, returnEvent, weeks });
  }

  return (
    <>
      <div className={styles.queryBar}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.retention.startEvent')}</span>
          <SimpleCustomSelect
            value={startEvent}
            onValueChange={setStartEvent}
            options={plannedEvents.map((name) => ({ value: name, label: name }))}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.retention.returnEvent')}</span>
          <SimpleCustomSelect
            value={returnEvent}
            onValueChange={setReturnEvent}
            options={plannedEvents.map((name) => ({ value: name, label: name }))}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.retention.weeks')}</span>
          <Input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
        </div>
        <DateRangeField
          label={t('reports.period')}
          from={from}
          to={to}
          invalid={!rangeValid}
          errorText={t('reports.states.rangeTooLong')}
          onChange={(f, tt) => { setFrom(f); setTo(tt); }}
        />
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
        <ReportMessageState icon={<Inbox size={30} />} text={t('reports.states.error')} />
      )}

      {!isLoading && !timeout && !isError && !data && (
        <ReportMessageState icon={<LayoutGrid size={30} />} text={t('reports.states.noQuery')} />
      )}

      {!isLoading && !timeout && data && req && (
        <RetentionResults report={data} weeks={req.weeks} />
      )}
    </>
  );
}

function RetentionResults({ report, weeks }: { report: RetentionReport; weeks: number }) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();

  if (report.cohorts.length === 0) {
    return <ReportMessageState icon={<Inbox size={30} />} text={t('reports.retention.empty')} />;
  }

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('reports.retention.columns.cohort')}</th>
            <th>{t('reports.retention.columns.users')}</th>
            <th>S0</th>
            {Array.from({ length: weeks }, (_, i) => <th key={`S${i + 1}`}>{`S${i + 1}`}</th>)}
          </tr>
        </thead>
        <tbody>
          {report.cohorts.map((cohort) => (
            <tr key={cohort.week}>
              <td>{t('reports.retention.cohortLabel', { date: formatCohortWeek(cohort.week) })}</td>
              <td>{format.number(cohort.size)}</td>
              <RetentionCell
                pct={1}
                label={format.number(1, { style: 'percent', maximumFractionDigits: 0 })}
                tooltip={t('reports.retention.tooltip', { returned: cohort.size, size: cohort.size })}
              />
              {Array.from({ length: weeks }, (_, i) => {
                const returned = cohort.returned[i];
                if (returned === undefined) return <td key={i} className={styles.retentionEmptyCell} />;
                const pct = cohort.size > 0 ? returned / cohort.size : 0;
                return (
                  <RetentionCell
                    key={i}
                    pct={pct}
                    label={format.number(pct, { style: 'percent', maximumFractionDigits: 0 })}
                    tooltip={t('reports.retention.tooltip', { returned, size: cohort.size })}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.legend}>
        <span>0%</span>
        <span className={styles.legendGradient} />
        <span>100%</span>
        <span>{t('reports.retention.legendHint')}</span>
      </div>
    </div>
  );
}

function RetentionCell({ pct, label, tooltip }: { pct: number; label: string; tooltip: string }) {
  return (
    <td
      className={`${styles.retentionCell} ${pct > 0.45 ? styles.retentionCellLight : ''}`}
      style={{ '--pct': pct } as CSSProperties}
      title={tooltip}
    >
      {label}
    </td>
  );
}
