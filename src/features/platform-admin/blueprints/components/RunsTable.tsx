'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';
import type { BlueprintRunDto, BlueprintRunStatus } from '@live-show/api-contracts';
import { useBlueprintRunsQuery } from '../queries/blueprints.queries';
import styles from './RunsTable.module.scss';

const FILTERS: Array<BlueprintRunStatus | 'ALL'> = ['ALL', 'RUNNING', 'WAITING', 'COMPLETED', 'CANCELLED', 'FAILED'];
const PILL_CLASS: Record<BlueprintRunStatus, string> = {
  RUNNING: styles.running, WAITING: styles.waiting, COMPLETED: styles.completed, CANCELLED: styles.cancelled, FAILED: styles.failed,
};

function fmtRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `hoje ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `ontem ${time}`;
  return `${date.toLocaleDateString('pt-BR')} ${time}`;
}

function runMeta(run: BlueprintRunDto): { text: string; className: string } {
  if (run.status === 'WAITING' && run.wakeAt) return { text: `acorda ${fmtRelative(run.wakeAt)}`, className: styles.metaWaiting };
  if (run.status === 'FAILED' && run.errorCode) return { text: run.errorCode, className: styles.metaFailed };
  return { text: fmtRelative(run.createdAt), className: styles.metaNeutral };
}

interface Props {
  blueprintId: string;
  onSelectRun: (run: BlueprintRunDto) => void;
}

// Design B1 left column: filter chips (status query param), run rows and
// "Carregar mais" via nextCursor, refreshed silently every 30s.
export function RunsTable({ blueprintId, onSelectRun }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const [filter, setFilter] = useState<BlueprintRunStatus | 'ALL'>('ALL');
  const status = filter === 'ALL' ? undefined : filter;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage, dataUpdatedAt } = useBlueprintRunsQuery(blueprintId, status);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => setSecondsAgo(Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000))), 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  const runs = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{t('detail.runs')}</h2>
        {!isLoading && <span className={styles.freshness}><span className={styles.pulse} />{t('detail.updatedAgo', { seconds: secondsAgo })}</span>}
      </div>
      <div className={styles.chips}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? t('detail.allRuns') : t(`runStatus.${f}`)}
          </button>
        ))}
      </div>
      {!isLoading && runs.length === 0 ? (
        <p className={styles.empty}>{t('detail.noRuns')}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>{(['status', 'version', 'node', 'meta'] as const).map((c) => <th key={c}>{t(`runColumns2.${c}`)}</th>)}</tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const meta = runMeta(r);
                return (
                  <tr key={r.id} className={styles.row} onClick={() => onSelectRun(r)}>
                    <td>
                      <span className={`${styles.pill} ${PILL_CLASS[r.status]}`}>
                        {r.status === 'WAITING' && <Clock size={11} />}
                        {t(`runStatus.${r.status}`)}
                      </span>
                    </td>
                    <td className={styles.mono}>v{r.version}</td>
                    <td className={styles.mono}>{r.currentNodeId ?? '—'}</td>
                    <td className={`${styles.mono} ${styles.right} ${meta.className}`}>{meta.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasNextPage && (
            <div className={styles.loadMoreRow}>
              <button className={styles.loadMore} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {t('detail.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
