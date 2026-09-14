'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { ArrowLeft, X } from 'lucide-react';
import type { BlueprintRunDto, BlueprintRunStepDto } from '@live-show/api-contracts';
import { useBlueprintRunChildrenQuery } from '../queries/blueprints.queries';
import styles from './RunDrawer.module.scss';

const RESULT_CLASS: Record<BlueprintRunStepDto['status'], string> = {
  OK: styles.resultOk, SKIPPED: styles.resultSkipped, FAILED: styles.resultFailed,
};

function fmtDateTime(iso: string, format: ReturnType<typeof useFormatter>): string {
  return format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function duration(step: BlueprintRunStepDto): string | null {
  if (!step.finishedAt) return null;
  const ms = new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

interface Props {
  blueprintId: string;
  run: BlueprintRunDto;
  onClose: () => void;
  // Navigates the drawer to another run by id — the page owner resolves the
  // run from its cached pages (see BlueprintDetailPage). Only present when
  // that navigation is possible: a child's "pai" button or a parent's child
  // list / "ver todos".
  onNavigate?: (runId: string) => void;
}

// Design D: run timeline drawer. Steps only ever carry ids/keys/timings — no
// personal data flows through a run, so there is nothing to redact here.
// Design D6/D7: a child run shows a breadcrumb back to its parent, a parent
// run with children lists its first 5 with a "ver todos" shortcut.
export function RunDrawer({ blueprintId, run, onClose, onNavigate }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const format = useFormatter();
  const outcomeLabel = (outcome: string) => (t.has(`runOutcome.${outcome}`) ? t(`runOutcome.${outcome}`) : outcome);
  const hasChildren = !!run.children && run.children.total > 0;
  const { data: childrenData, isLoading: childrenLoading } = useBlueprintRunChildrenQuery(blueprintId, run.id, { enabled: hasChildren });
  const children = (childrenData?.pages.flatMap((p) => p.items) ?? []).slice(0, 5);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('drawer.title')}>
        <div className={styles.header}>
          {run.parentRunId ? (
            <div className={styles.crumbRow}>
              <span className={styles.crumb}>{t('runs.children.parentCrumb', { index: run.itemIndex })}</span>
              <button className={styles.close} onClick={onClose} aria-label={t('drawer.close')}><X size={18} /></button>
            </div>
          ) : (
            <div className={styles.headTop}>
              <span className={styles.pill}>{t(`runStatus.${run.status}`)}</span>
              <button className={styles.close} onClick={onClose} aria-label={t('drawer.close')}><X size={18} /></button>
            </div>
          )}
          {run.parentRunId && onNavigate && (
            <button className={styles.parentBtn} onClick={() => onNavigate(run.parentRunId!)}>
              <ArrowLeft size={12} />{t('runs.children.parent')}
            </button>
          )}
          {run.parentRunId ? (
            <div className={styles.headTop}>
              <span className={styles.runId}>{run.id.slice(0, 12)} · #{run.itemIndex}</span>
              <span className={styles.pill}>{t(`runStatus.${run.status}`)}</span>
            </div>
          ) : (
            <div className={styles.runId}>{run.id.slice(0, 12)}</div>
          )}
          <div className={styles.sub}>
            {run.parentRunId && `${t('runs.children.itemLine', { index: run.itemIndex })} · `}v{run.version} · {fmtDateTime(run.createdAt, format)}
          </div>
          {run.status === 'WAITING' && run.wakeAt && (
            <div className={styles.wake}>{t('drawer.wakeAt', { datetime: fmtDateTime(run.wakeAt, format) })}</div>
          )}
          {hasChildren && (
            <div className={styles.childrenSummary}>
              <span className={styles.pill}>{t('runs.children.summary', { total: run.children!.total, completed: run.children!.completed, failed: run.children!.failed, running: run.children!.running })}</span>
            </div>
          )}
        </div>

        {run.status === 'CANCELLED' && <div className={styles.banner}>{t('drawer.cancelledBanner')}</div>}

        <div className={styles.body}>
          {hasChildren && (
            <div className={styles.childrenSection}>
              <div className={styles.childrenTitle}>{t('runs.children.title')}</div>
              <div className={styles.childrenList}>
                {children.map((child) => (
                  <button key={child.id} className={styles.childItem} onClick={() => onNavigate?.(child.id)}>
                    <span className={styles.childIdx}>#{child.itemIndex}</span>
                    <span className={styles.pill}>{t(`runStatus.${child.status}`)}</span>
                    <span className={styles.childUpdated}>{fmtDateTime(child.updatedAt, format)}</span>
                  </button>
                ))}
              </div>
              {!childrenLoading && run.children!.total > children.length && (
                <button className={styles.seeAll} onClick={() => onNavigate?.(run.id)}>
                  {t('runs.children.seeAll', { total: run.children!.total })}
                </button>
              )}
            </div>
          )}
          {run.steps.length === 0 && <p className={styles.empty}>{t('drawer.noSteps')}</p>}
          {run.steps.map((step, i) => {
            const dur = duration(step);
            return (
              <div key={`${step.nodeId}-${i}`} className={styles.step}>
                <div className={styles.rail}>
                  <span className={styles.dot} />
                  {i < run.steps.length - 1 && <span className={styles.line} />}
                </div>
                <div className={styles.stepBody}>
                  <div className={styles.stepHead}>
                    <span className={styles.stepId}>{step.nodeId}</span>
                    <span className={styles.stepKey}>{step.nodeKey}</span>
                    <span className={`${styles.resultPill} ${RESULT_CLASS[step.status]}`}>{t(`drawer.result.${step.status}`)}</span>
                  </div>
                  {step.outcome && <div className={styles.outcome}>{outcomeLabel(step.outcome)}</div>}
                  {step.errorCode && <div className={styles.errorCode}>{step.errorCode}</div>}
                  <div className={styles.timing}>
                    {fmtDateTime(step.startedAt, format)}{step.finishedAt ? ` → ${fmtDateTime(step.finishedAt, format)}` : ''}
                    {dur ? ` · ${dur}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <Link
            className={styles.footerBtn}
            href={`/dashboard/platform/blueprints/${encodeURIComponent(blueprintId)}/editor?${new URLSearchParams({ version: run.versionId, ...(run.currentNodeId ? { node: run.currentNodeId } : {}) })}`}
          >
            {t('drawer.openEditor')}
          </Link>
        </div>
      </aside>
    </div>
  );
}
