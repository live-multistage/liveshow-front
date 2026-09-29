'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { BarChart3, Inbox, X } from 'lucide-react';
import { Button, Input, SimpleCustomSelect } from '@live-show/design-system';
import type { FunnelReport, FunnelRequest } from '@live-show/api-contracts';
import { useFunnelReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import { DateRangeField } from './DateRangeField';
import { ReportLoadingSkeleton, ReportMessageState, TimeoutBanner } from './ReportStates';
import {
  defaultRange,
  isRangeValid,
  isTimeoutError,
  maxWindowValue,
  toWindowMinutes,
  type WindowUnit,
} from './report-utils';
import styles from './ReportsShared.module.scss';

const MAX_STEPS = 8;
const MIN_STEPS = 2;

export function FunnelTab() {
  const t = useTranslations('platformAdmin.tracking');
  const { data: plan } = useTrackingPlanQuery();
  const plannedEvents = useMemo(
    () => (plan ?? []).filter((e) => e.status === 'live' || e.status === 'deprecated').map((e) => e.name),
    [plan],
  );

  const initialRange = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  // Each step needs a stable id independent of its selected event (two steps
  // can both be unset, or later share an event) so the list can be keyed
  // without falling back to array index.
  const [steps, setSteps] = useState<{ id: string; event: string }[]>([
    { id: 'step-0', event: '' },
    { id: 'step-1', event: '' },
  ]);
  const nextStepId = useRef(2);
  const [windowValue, setWindowValue] = useState(24);
  const [unit, setUnit] = useState<WindowUnit>('h');
  const [req, setReq] = useState<FunnelRequest | null>(null);

  const rangeValid = isRangeValid(from, to);
  const filledSteps = steps.filter((s) => s.event !== '');
  const stepsValid = steps.length >= MIN_STEPS && filledSteps.length === steps.length;
  const windowValid = windowValue >= 1 && windowValue <= maxWindowValue(unit);
  const canRun = rangeValid && stepsValid && windowValid;

  const { data, isLoading, isError, error } = useFunnelReportQuery(req);
  const timeout = isTimeoutError(error);

  function updateStep(id: string, value: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, event: value } : s)));
  }

  function addStep() {
    setSteps((prev) => (prev.length >= MAX_STEPS ? prev : [...prev, { id: `step-${nextStepId.current++}`, event: '' }]));
  }

  function removeStep(id: string) {
    setSteps((prev) => (prev.length <= MIN_STEPS ? prev : prev.filter((s) => s.id !== id)));
  }

  function handleRun() {
    if (!canRun) return;
    setReq({ from, to, steps: steps.map((s) => s.event), windowMinutes: toWindowMinutes(windowValue, unit) });
  }

  return (
    <>
      <div className={styles.card}>
        <span className={styles.fieldLabel}>{t('reports.funnels.steps')}</span>
        <div className={styles.funnelSteps}>
          {steps.map((step, index) => (
            <div className={styles.funnelStep} key={step.id}>
              {index > 0 && <span className={styles.mono}>→</span>}
              <span className={styles.stepIndex}>{index + 1}</span>
              <SimpleCustomSelect
                value={step.event}
                onValueChange={(v) => updateStep(step.id, v)}
                options={plannedEvents.map((name) => ({ value: name, label: name }))}
              />
              {steps.length > MIN_STEPS && (
                <button type="button" className={styles.removeStep} onClick={() => removeStep(step.id)} aria-label="remove">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {steps.length < MAX_STEPS && (
            <button type="button" className={styles.addStepLink} onClick={addStep}>
              {t('reports.funnels.addStep')}
            </button>
          )}
        </div>
        {!stepsValid && <span className={styles.fieldError}>{t('reports.funnels.minStepsError')}</span>}
      </div>

      <div className={styles.queryBar}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.funnels.window')}</span>
          <Input
            type="number"
            min={1}
            max={maxWindowValue(unit)}
            value={windowValue}
            onChange={(e) => setWindowValue(Number(e.target.value))}
          />
          {!windowValid && (
            <span className={styles.fieldError}>
              {t('reports.funnels.windowMaxError', { max: maxWindowValue(unit) })}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('reports.funnels.unit')}</span>
          <SimpleCustomSelect
            value={unit}
            onValueChange={(v) => setUnit(v as WindowUnit)}
            options={[
              { value: 'min', label: t('reports.funnels.unitMin') },
              { value: 'h', label: t('reports.funnels.unitHour') },
              { value: 'dias', label: t('reports.funnels.unitDays') },
            ]}
          />
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
        <ReportMessageState icon={<BarChart3 size={30} />} text={t('reports.states.noQuery')} />
      )}

      {!isLoading && !timeout && data && req && (
        <FunnelResults report={data} windowMinutes={req.windowMinutes} />
      )}
    </>
  );
}

function FunnelResults({ report, windowMinutes }: { report: FunnelReport; windowMinutes: number }) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();

  if (report.steps.length === 0) {
    return <ReportMessageState icon={<Inbox size={30} />} text={t('reports.funnels.empty')} />;
  }

  const firstCount = report.steps[0].count || 1;
  const hours = windowMinutes / 60;

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('reports.funnels.columns.step')}</th>
            <th />
            <th>{t('reports.funnels.columns.count')}</th>
            <th>{t('reports.funnels.columns.fromPrevious')}</th>
            <th>{t('reports.funnels.columns.fromFirst')}</th>
          </tr>
        </thead>
        <tbody>
          {report.steps.map((step, i) => {
            const solidPct = (step.count / firstCount) * 100;
            const prevCount = i > 0 ? report.steps[i - 1].count : step.count;
            const stripedPct = i > 0 ? Math.max(0, ((prevCount - step.count) / firstCount) * 100) : 0;
            return (
              <tr key={step.event}>
                <td>
                  <span className={styles.stepIndex}>{i + 1}</span> {step.event}
                </td>
                <td>
                  <div
                    className={styles.funnelBarTrack}
                    style={{ '--solid-pct': `${solidPct}%`, '--striped-pct': `${stripedPct}%` } as CSSProperties}
                  >
                    <div className={styles.funnelBarSolid} />
                    <div className={styles.funnelBarStripe} />
                  </div>
                </td>
                <td>{format.number(step.count)}</td>
                <td>{i === 0 ? '—' : format.number(step.conversionFromPrevious, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                <td>{format.number(step.conversionFromFirst, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.mono}>
        {t('reports.funnels.footnote', { hours: format.number(hours, { maximumFractionDigits: 1 }), minutes: format.number(windowMinutes) })}
      </p>
    </div>
  );
}
