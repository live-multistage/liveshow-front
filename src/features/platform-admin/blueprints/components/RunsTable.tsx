'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Skeleton } from '@live-show/design-system';
import type { BlueprintRunDto, BlueprintRunStatus } from '@live-show/api-contracts';
import { useBlueprintRunChildrenQuery, useBlueprintRunsQuery } from '../queries/blueprints.queries';
import styles from './RunsTable.module.scss';

type Translator = ReturnType<typeof useTranslations>;
type Formatter = ReturnType<typeof useFormatter>;

const FILTERS: Array<BlueprintRunStatus | 'ALL'> = ['ALL', 'RUNNING', 'WAITING', 'COMPLETED', 'CANCELLED', 'FAILED'];
const PILL_CLASS: Record<BlueprintRunStatus, string> = {
  RUNNING: styles.running, WAITING: styles.waiting, COMPLETED: styles.completed, CANCELLED: styles.cancelled, FAILED: styles.failed,
};

function fmtRelative(iso: string, t: Translator, format: Formatter): string {
  const date = new Date(iso);
  const now = new Date();
  const time = format.dateTime(date, { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return t('detail.today', { time });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('detail.yesterday', { time });
  return `${format.dateTime(date, { dateStyle: 'short' })} ${time}`;
}

function runMeta(run: BlueprintRunDto, t: Translator, format: Formatter): { text: string; className: string } {
  if (run.status === 'WAITING' && run.wakeAt) return { text: t('detail.wakes', { when: fmtRelative(run.wakeAt, t, format) }), className: styles.metaWaiting };
  if (run.status === 'FAILED' && run.errorCode) return { text: run.errorCode, className: styles.metaFailed };
  return { text: fmtRelative(run.createdAt, t, format), className: styles.metaNeutral };
}

function StatusPill({ run, t }: { run: BlueprintRunDto; t: Translator }) {
  return (
    <span className={`${styles.pill} ${PILL_CLASS[run.status]}`}>
      {run.status === 'WAITING' && <Clock size={11} />}
      {t(`runStatus.${run.status}`)}
    </span>
  );
}

interface ChildRowsProps {
  blueprintId: string;
  runId: string;
  onSelectRun: (run: BlueprintRunDto) => void;
  t: Translator;
  format: Formatter;
  childCounts: BlueprintRunDto['children'];
}

// Split out so the children query only mounts (and fetches) once a parent
// row is actually expanded.
function ChildRows({ blueprintId, runId, onSelectRun, t, format, childCounts }: ChildRowsProps) {
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useBlueprintRunChildrenQuery(blueprintId, runId, { enabled: true });
  const children = data?.pages.flatMap((p) => p.items) ?? [];

  // The parent's 30s poll can bump these counts while this row stays
  // expanded; refetch the child list so it doesn't go stale. Skipped on
  // mount since the query itself already fetches then.
  const countsSignature = childCounts
    ? `${childCounts.total}:${childCounts.running}:${childCounts.completed}:${childCounts.cancelled}:${childCounts.failed}`
    : null;
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsSignature]);

  if (isLoading) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <tr key={i} className={styles.childRow}>
            <td><Skeleton className={styles.skeletonPill} /></td>
            <td><Skeleton className={styles.skeletonSmall} /></td>
            <td><Skeleton className={styles.skeletonSmall} /></td>
            <td><Skeleton className={styles.skeletonSmall} /></td>
          </tr>
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <tr className={styles.childRow}>
        <td colSpan={4}>
          <div className={styles.childrenError}>
            <span>{t('runs.children.error')}</span>
            <button className={styles.loadMore} onClick={() => refetch()}>{t('runs.children.retry')}</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {children.map((child) => {
        const meta = runMeta(child, t, format);
        return (
          <tr
            key={child.id}
            className={`${styles.row} ${styles.childRow}`}
            tabIndex={0}
            role="button"
            onClick={() => onSelectRun(child)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectRun(child); } }}
          >
            <td><StatusPill run={child} t={t} /></td>
            <td className={styles.mono}>v{child.version}</td>
            <td className={styles.mono}>#{child.itemIndex}</td>
            <td className={`${styles.mono} ${styles.right} ${meta.className}`}>{meta.text}</td>
          </tr>
        );
      })}
      {hasNextPage && (
        <tr className={styles.childRow}>
          <td colSpan={4}>
            <div className={styles.loadMoreRow}>
              <button className={styles.loadMore} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {t('runs.children.loadMore')}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface Props {
  blueprintId: string;
  onSelectRun: (run: BlueprintRunDto) => void;
  expandedRunId?: string | null;
  onToggleExpand?: (runId: string) => void;
}

// Design B1 left column: filter chips (status query param), run rows and
// "Carregar mais" via nextCursor, refreshed silently every 30s. Design D1/D2:
// a core.forEach parent shows a children summary badge and can expand into
// its child runs (D3 loading, D4 error+retry).
export function RunsTable({ blueprintId, onSelectRun, expandedRunId = null, onToggleExpand = () => {} }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const format = useFormatter();
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
                const meta = runMeta(r, t, format);
                const hasChildren = (r.children?.total ?? 0) > 0;
                const expandable = hasChildren;
                const expanded = expandedRunId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={styles.row}
                      tabIndex={0}
                      role="button"
                      onClick={() => onSelectRun(r)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectRun(r); } }}
                    >
                      <td>
                        <div className={styles.statusCell}>
                          {expandable && (
                            <button
                              type="button"
                              className={styles.chevron}
                              aria-label={t(expanded ? 'runs.children.collapse' : 'runs.children.expand')}
                              aria-expanded={expanded}
                              onClick={(e) => { e.stopPropagation(); onToggleExpand(r.id); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                            >
                              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          )}
                          <StatusPill run={r} t={t} />
                        </div>
                      </td>
                      <td className={styles.mono}>v{r.version}</td>
                      <td className={styles.mono}>
                        {hasChildren
                          ? (
                            <span className={`${styles.pill} ${styles.childrenBadge}`}>
                              {t('runs.children.summary', { total: r.children!.total, completed: r.children!.completed, failed: r.children!.failed, running: r.children!.running })}
                            </span>
                          )
                          : (r.currentNodeId ?? '—')}
                      </td>
                      <td className={`${styles.mono} ${styles.right} ${meta.className}`}>{meta.text}</td>
                    </tr>
                    {expandable && expanded && (
                      <ChildRows blueprintId={blueprintId} runId={r.id} onSelectRun={onSelectRun} t={t} format={format} childCounts={r.children} />
                    )}
                  </Fragment>
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
