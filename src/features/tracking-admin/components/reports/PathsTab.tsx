'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Inbox, Route } from 'lucide-react';
import { Button, Input } from '@live-show/design-system';
import { PATHS_MAX_RANGE_DAYS } from '@live-show/api-contracts';
import type { PathDirection, PathMatch, PathsRequest, PathSessionsRequest } from '@live-show/api-contracts';
import { usePathsReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import { matchSessions, pathNodeLabel } from '../../utils/path-node';
import { DateRangeField } from './DateRangeField';
import { PathSessionsPanel } from './PathSessionsPanel';
import { SankeyChart } from './SankeyChart';
import { ReportLoadingSkeleton, ReportMessageState, TimeoutBanner } from './ReportStates';
import { defaultRange, isRangeValid, isTimeoutError, isValidAnchor, parsePathsParams, toReportRangeBounds } from './report-utils';
import reportStyles from './ReportsShared.module.scss';
import styles from './PathsTab.module.scss';

const MIN_STEPS = 1;
const MAX_STEPS = 5;
const TOP_K = 8;
const ANCHOR_LIST_ID = 'paths-anchor-options';
const DIRECTIONS: { value: PathDirection; labelKey: string }[] = [
  { value: 'after', labelKey: 'reports.paths.directionAfter' },
  { value: 'before', labelKey: 'reports.paths.directionBefore' },
  { value: 'both', labelKey: 'reports.paths.directionBoth' },
];

export function PathsTab() {
  const t = useTranslations('platformAdmin.tracking');
  const { data: plan } = useTrackingPlanQuery();
  const plannedEvents = useMemo(
    () => (plan ?? []).filter((e) => e.status === 'live' || e.status === 'deprecated').map((e) => e.name),
    [plan],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A valid query in the URL is a previously submitted one (back/refresh): restore the form and re-request it.
  const [restored] = useState(() => (searchParams ? parsePathsParams(searchParams) : null));
  const [initialRange] = useState(() => restored ?? defaultRange());
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [anchor, setAnchor] = useState(restored?.anchor ?? '');
  const [direction, setDirection] = useState<PathDirection>(restored?.direction ?? 'after');
  const [steps, setSteps] = useState(restored?.steps ?? 3);
  const [req, setReq] = useState<PathsRequest | null>(() =>
    restored
      ? { ...toReportRangeBounds(restored.from, restored.to), anchor: restored.anchor, direction: restored.direction, steps: restored.steps, topK: TOP_K }
      : null,
  );
  const [match, setMatch] = useState<PathMatch[] | null>(null);

  const rangeValid = isRangeValid(from, to, PATHS_MAX_RANGE_DAYS);
  const anchorValid = isValidAnchor(anchor);
  const stepsValid = Number.isInteger(steps) && steps >= MIN_STEPS && steps <= MAX_STEPS;
  const canRun = rangeValid && anchorValid && stepsValid;

  const { data, isLoading, isError, error } = usePathsReportQuery(req);
  const timeout = isTimeoutError(error);

  function handleRun() {
    if (!canRun) return;
    setMatch(null);
    setReq({ ...toReportRangeBounds(from, to), anchor, direction, steps, topK: TOP_K });
    const query = new URLSearchParams({ anchor, direction, steps: String(steps), from, to });
    router.replace(`${pathname}?${query}`, { scroll: false });
  }

  const sessionsRequest: PathSessionsRequest | null =
    req && match ? { from: req.from, to: req.to, anchor: req.anchor, direction: req.direction, steps: req.steps, match } : null;

  return (
    <>
      <div className={reportStyles.queryBar}>
        <div className={reportStyles.field}>
          <span className={reportStyles.fieldLabel}>{t('reports.paths.anchor')}</span>
          <Input
            list={ANCHOR_LIST_ID}
            aria-label={t('reports.paths.anchor')}
            placeholder={t('reports.paths.anchorPlaceholder')}
            value={anchor}
            onChange={(e) => setAnchor(e.target.value.trim())}
          />
          <datalist id={ANCHOR_LIST_ID}>
            {plannedEvents.map((name) => <option key={name} value={name} />)}
          </datalist>
          {anchor !== '' && !anchorValid ? (
            <span className={reportStyles.fieldError}>{t('reports.paths.anchorInvalid')}</span>
          ) : (
            <span className={reportStyles.mono}>{t('reports.paths.anchorHint')}</span>
          )}
        </div>
        <div className={reportStyles.field}>
          <span className={reportStyles.fieldLabel}>{t('reports.paths.direction')}</span>
          <div className={styles.segmented} role="group" aria-label={t('reports.paths.direction')}>
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                aria-pressed={direction === d.value}
                className={`${styles.segment} ${direction === d.value ? styles.segmentActive : ''}`}
                onClick={() => setDirection(d.value)}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className={reportStyles.field}>
          <span className={reportStyles.fieldLabel}>{t('reports.paths.steps')}</span>
          <Input
            type="number"
            min={MIN_STEPS}
            max={MAX_STEPS}
            aria-label={t('reports.paths.steps')}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
        </div>
        <DateRangeField
          label={t('reports.paths.period')}
          from={from}
          to={to}
          invalid={!rangeValid}
          errorText={t('reports.paths.rangeTooLong')}
          onChange={(f, tt) => { setFrom(f); setTo(tt); }}
        />
        <div className={reportStyles.runBar}>
          <Button onClick={handleRun} disabled={!canRun}>{t('reports.paths.run')}</Button>
        </div>
      </div>

      {isLoading && <ReportLoadingSkeleton />}

      {!isLoading && timeout && (
        <>
          <TimeoutBanner text={t('reports.states.timeout')} />
          <ReportMessageState icon={<Inbox size={30} />} text={t('reports.paths.timeoutEmpty')} />
        </>
      )}

      {!isLoading && !timeout && isError && (
        <ReportMessageState icon={<Inbox size={30} />} text={t('reports.states.error')} />
      )}

      {!isLoading && !timeout && !isError && !data && (
        <ReportMessageState icon={<Route size={30} />} text={t('reports.paths.noQuery')} />
      )}

      {!isLoading && !timeout && data && req && data.sessions === 0 && (
        <ReportMessageState
          icon={<Inbox size={30} />}
          text={t('reports.paths.empty', { anchor: pathNodeLabel(req.anchor, t as (k: string) => string) })}
        />
      )}

      {!isLoading && !timeout && data && req && data.sessions > 0 && (
        <>
          <div className={styles.summary}>
            <span>
              <span className={styles.total}>{t('reports.paths.summary', { count: data.sessions })}</span>{' '}
              <span className={styles.anchorChip}>{pathNodeLabel(req.anchor, t as (k: string) => string)}</span>
            </span>
            <span className={reportStyles.mono}>{t('reports.paths.chartHint')}</span>
          </div>
          <div className={`${reportStyles.card} ${styles.chartCard}`}>
            <SankeyChart report={data} selected={match} onSelect={setMatch} />
          </div>
          {sessionsRequest && match && (
            <PathSessionsPanel request={sessionsRequest} total={matchSessions(data, match)} onClose={() => setMatch(null)} />
          )}
        </>
      )}
    </>
  );
}
