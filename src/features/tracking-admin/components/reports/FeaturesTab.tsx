'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Inbox, LayoutGrid } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { FeaturesReport, ReportRange } from '@live-show/api-contracts';
import { useFeaturesReportQuery } from '../../queries/get-reports';
import { DateRangeField } from './DateRangeField';
import { ReportLoadingSkeleton, ReportMessageState, TimeoutBanner } from './ReportStates';
import { defaultRange, formatDuration, isRangeValid, isTimeoutError, toReportRangeBounds } from './report-utils';
import styles from './ReportsShared.module.scss';

type SortKey = 'feature' | 'sessions' | 'users' | 'p50Ms' | 'p75Ms';

export function FeaturesTab() {
  const t = useTranslations('platformAdmin.tracking');
  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [req, setReq] = useState<ReportRange | null>(null);

  const rangeValid = isRangeValid(from, to);

  const { data, isLoading, isError, error } = useFeaturesReportQuery(req);
  const timeout = isTimeoutError(error);

  function handleRun() {
    if (!rangeValid) return;
    setReq(toReportRangeBounds(from, to));
  }

  return (
    <>
      <div className={styles.queryBar}>
        <DateRangeField
          label={t('reports.period')}
          from={from}
          to={to}
          invalid={!rangeValid}
          errorText={t('reports.states.rangeTooLong')}
          onChange={(f, tt) => { setFrom(f); setTo(tt); }}
        />
        <div className={styles.runBar}>
          <Button onClick={handleRun} disabled={!rangeValid}>{t('reports.run')}</Button>
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

      {!isLoading && !timeout && data && <FeaturesResults report={data} />}
    </>
  );
}

function FeaturesResults({ report }: { report: FeaturesReport }) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const [sortKey, setSortKey] = useState<SortKey>('sessions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const rows = [...report.features];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [report.features, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('desc');
  }

  if (report.features.length === 0) {
    return <ReportMessageState icon={<Inbox size={30} />} text={t('reports.features.empty')} />;
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'feature', label: t('reports.features.columns.feature') },
    { key: 'sessions', label: t('reports.features.columns.sessions') },
    { key: 'users', label: t('reports.features.columns.users') },
    { key: 'p50Ms', label: t('reports.features.columns.medianActive') },
    { key: 'p75Ms', label: t('reports.features.columns.p75Active') },
  ];

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${styles.sortable} ${sortKey === col.key ? styles.active : ''}`}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}{sortKey === col.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr key={f.feature}>
              <td>{f.feature}</td>
              <td className={styles.totalCell}>{format.number(f.sessions)}</td>
              <td>{format.number(f.users)}</td>
              <td>{formatDuration(f.p50Ms)}</td>
              <td>{formatDuration(f.p75Ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
