'use client';

import { AlertTriangle, ArrowRight, Check, Clock, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { Button, cn } from '@live-show/design-system';
import { kindClass } from '../nodeVisuals';
import type { UseTourResult } from './useTour';
import styles from './TourPanel.module.scss';

// Prompted from `Showon Blueprint Tutorial.dc.html` (see
// design/briefs/2026-09-14-blueprints-editor-tutorial.md §Copy). Keys are the
// full path the step logic (tourSteps.ts) already hands us, so `t()` here
// takes it as-is with the namespace stripped.
const REPLAY_URL = 'https://claude.ai/code/artifact/8d1aaaaf-420a-4a69-ab7c-0034c1124695';
const TOTAL_STEPS = 9;

interface Props {
  tour: UseTourResult;
  catalog: Map<string, BlueprintCatalogEntry>;
  blueprintId: string;
  /** True once the current draft has an active version (design B2 vs B3). */
  active: boolean;
  onDoForMe(): void;
  onActivate(): void;
  activating: boolean;
}

export function TourPanel({ tour, catalog, blueprintId, active, onDoForMe, onActivate, activating }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const rel = (key: string) => key.replace(/^platformAdmin\.blueprints\./, '');

  if (!tour.visible) return null;
  if (tour.completed) return <CompletionPanel t={t} blueprintId={blueprintId} active={active} onActivate={onActivate} activating={activating} onClose={tour.skip} />;

  const { stepDef, step, stepChecked } = tour;
  const entry = stepDef.nodeKey ? [...catalog.values()].find((e) => e.key === stepDef.nodeKey) : undefined;
  const showFooterActions = step > 0;
  const canDoForMe = step >= 1 && step <= 7;
  const canGoNext = step < 8;

  return (
    <aside className={styles.panel} role="dialog" aria-label={t('tour.stepLabel', { n: step + 1 })}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {stepChecked && step > 0 && (
            <span className={styles.checkBadge}><Check size={13} aria-hidden /></span>
          )}
          <span className={styles.stepLabel}>{t('tour.stepLabel', { n: step + 1 })}</span>
        </div>
        <button type="button" className={styles.closeBtn} aria-label={t('tour.skip')} onClick={tour.skip}>
          <X size={15} aria-hidden />
        </button>
      </header>

      <div className={styles.body}>
        <h2 className={styles.title}>
          {entry && <span className={cn(styles.typeChip, kindClass(entry.kind))}>{t(`editor.kind.${entry.kind}`)}</span>}
          {t(rel(stepDef.titleKey))}
        </h2>
        <p className={styles.text}>{t(rel(stepDef.bodyKey))}</p>

        {step > 0 && (
          <div className={styles.checklist}>
            <div className={styles.checklistLabel}>{t('tour.whatToFill')}</div>
            <div className={styles.checklistBody}>{t(`tour.steps.${step}.checklist`)}</div>
          </div>
        )}

        {stepDef.hintKey && (
          <div className={styles.hint}>
            <AlertTriangle size={13} aria-hidden className={styles.hintIcon} />
            <span>{t('tour.hint', { hint: t(rel(stepDef.hintKey)) })}</span>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        {showFooterActions ? (
          <div className={styles.actions}>
            <Button variant="outline" size="sm" onClick={tour.previous}>{t('tour.previous')}</Button>
            {canDoForMe && <Button variant="outline" size="sm" onClick={onDoForMe}>{t('tour.doForMe')}</Button>}
            {canGoNext && (
              <Button size="sm" disabled={!stepChecked} onClick={tour.next}>{t('tour.next')}</Button>
            )}
          </div>
        ) : (
          <div className={styles.actionsEnd}>
            <Button size="sm" onClick={tour.next}>{t('tour.next')}</Button>
          </div>
        )}
        {step < 8 && (
          <button type="button" className={styles.skipLink} onClick={tour.skip}>{t('tour.skip')}</button>
        )}
      </footer>
    </aside>
  );
}

function CompletionPanel({ t, blueprintId, active, onActivate, activating, onClose }: {
  t: ReturnType<typeof useTranslations>;
  blueprintId: string;
  active: boolean;
  onActivate(): void;
  activating: boolean;
  onClose(): void;
}) {
  return (
    <aside className={styles.panel} role="dialog" aria-label={t('tour.completion.activeTitle')}>
      <div className={cn(styles.body, styles.completionBody)}>
        <div className={cn(styles.completionIcon, active ? styles.completionIconActive : styles.completionIconPending)}>
          {active ? <Check size={24} aria-hidden /> : <Clock size={24} aria-hidden />}
        </div>
        <h2 className={styles.completionTitle}>{active ? t('tour.completion.activeTitle') : t('tour.completion.pendingTitle')}</h2>
        <p className={styles.text}>{active ? t('tour.completion.activeSub') : t('tour.completion.pendingSub')}</p>

        {active ? (
          <div className={styles.checklist}>
            <div className={styles.checklistLabel}>{t('tour.completion.learnedLabel')}</div>
            <ul className={styles.learnedList}>
              {[0, 1, 2].map((i) => (
                <li key={i}><Check size={13} aria-hidden className={styles.learnedCheck} />{t(`tour.completion.learned.${i}`)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className={styles.checklist}>
            <div className={styles.checklistLabel}>{t('tour.completion.stepsLabel')}</div>
            <div className={styles.stepGrid}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className={styles.stepSquare}><Check size={12} aria-hidden /></span>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className={styles.footer}>
        <div className={styles.actions}>
          {active ? (
            <Link className={styles.viewRunsLink} href={`/dashboard/platform/blueprints/${blueprintId}`}>
              <Button size="sm">{t('tour.viewRuns')}</Button>
            </Link>
          ) : (
            <Button size="sm" disabled={activating} onClick={onActivate}>{t('tour.activate')}</Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>{t('tour.close')}</Button>
        </div>
        {active && (
          <a className={styles.replayLink} href={REPLAY_URL} target="_blank" rel="noreferrer">
            {t('tour.viewReplay')}<ArrowRight size={12} aria-hidden />
          </a>
        )}
      </footer>
    </aside>
  );
}
