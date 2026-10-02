'use client';

import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { Button, Dialog, DialogContent, DialogTitle } from '@live-show/design-system';
import type { PathMatch, PathSessionsRequest } from '@live-show/api-contracts';
import { usePathSessionsQuery } from '../../queries/get-reports';
import { isSyntheticNode, pathNodeLabel } from '../../utils/path-node';
import { formatDuration, isTimeoutError } from './report-utils';
import { ReportLoadingSkeleton, TimeoutBanner } from './ReportStates';
import styles from './PathSessionsPanel.module.scss';

const SHORT_ID = 8;

interface Props {
  request: PathSessionsRequest;
  /** Sessions behind the selected node/band, for the "N of M" line. */
  total: number;
  onClose: () => void;
}

export function PathSessionsPanel({ request, total, onClose }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const { data, isLoading, isError, error, refetch } = usePathSessionsQuery(request);
  const label = (key: string) => pathNodeLabel(key, t as (k: string) => string);
  const samples = data?.sessions ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.panel} aria-describedby={undefined}>
        <header className={styles.header}>
          <DialogTitle className={styles.title}>{t('reports.paths.samplesTitle')}</DialogTitle>
          <div className={styles.chips}>
            {request.match.map((m: PathMatch, i) => (
              <span key={`${m.offset}|${m.node}`} className={styles.chipGroup}>
                {i > 0 && <span className={styles.arrow}>→</span>}
                <span className={`${styles.chip} ${isSyntheticNode(m.node) ? styles.chipSynthetic : ''}`}>{label(m.node)}</span>
              </span>
            ))}
          </div>
          {!isLoading && samples.length > 0 && (
            <span className={styles.meta}>
              {t('reports.paths.samplesMeta', { shown: format.number(samples.length), total: format.number(total) })}
            </span>
          )}
        </header>

        <div className={styles.list}>
          {isLoading && <ReportLoadingSkeleton />}
          {isError && isTimeoutError(error) && <TimeoutBanner text={t('reports.states.timeout')} />}
          {isError && !isTimeoutError(error) && (
            <div className={styles.error}>
              <p>{t('reports.states.error')}</p>
              <Button variant="outline" onClick={() => refetch()}>{t('journey.retry')}</Button>
            </div>
          )}
          {!isLoading && !isError && samples.length === 0 && <p className={styles.empty}>{t('reports.paths.samplesEmpty')}</p>}
          {samples.map((s) => (
            <div className={styles.row} key={s.sessionId}>
              <span className={styles.start}>
                {format.dateTime(new Date(s.startedAt), { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              <Link
                className={styles.open}
                href={`/dashboard/platform/tracking/sessions/${encodeURIComponent(s.sessionId)}?anonymousId=${encodeURIComponent(s.anonymousId)}`}
              >
                {t('reports.paths.openSession')} →
              </Link>
              <div className={styles.facts}>
                <span>{formatDuration(s.durationSeconds * 1000)}</span>
                <span>{t('reports.paths.stepsCount', { count: s.steps })}</span>
                <span className={s.userId ? styles.user : styles.anonymous}>
                  {s.userId ? s.userId.slice(0, SHORT_ID) : t('reports.paths.anonymous')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
