'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { TOUR_STEPS, firstIncompleteStep, type TourContext, type TourStepId } from './tourSteps';

interface Options {
  enabled: boolean;
  state: TourContext['state'];
  analysisOk: boolean | null;
  published: boolean;
  active: boolean;
  blueprintId: string;
}

interface Persisted { step: TourStepId; skipped: boolean }

const storageKey = (id: string) => `bp-tour:${id}`;

// ponytail: best-effort persistence only — a private-browsing quota error
// (or SSR with no localStorage) just means the tour won't resume; it still
// works for the current session.
function loadPersisted(id: string): Persisted | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function savePersisted(id: string, data: Persisted) {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(data));
  } catch { /* best-effort, see above */ }
}

export interface UseTourResult {
  /** false once skipped, or when `enabled` is false — nothing should render. */
  visible: boolean;
  step: TourStepId;
  stepDef: (typeof TOUR_STEPS)[number];
  /** True once the *current* step's check passes (drives the header check + Próximo). */
  stepChecked: boolean;
  /** The whole tour is done: step 8 checked. */
  completed: boolean;
  next(): void;
  previous(): void;
  /** Call right after dispatching the step's autoApply patch. */
  advanceAfterAutoApply(): void;
  skip(): void;
}

export function useTour({ enabled, state, analysisOk, published, active, blueprintId }: Options): UseTourResult {
  const t = useTranslations('platformAdmin.blueprints');
  const ctx: TourContext = { state, analysisOk, published, active };
  const incomplete = firstIncompleteStep(ctx);
  const [step, setStep] = useState<TourStepId>(0);
  const [skipped, setSkipped] = useState(false);
  const initialized = useRef(false);

  // Step 0's check() is unconditionally true (it's pure instruction, nothing
  // to fill in), so firstIncompleteStep never returns it — a genuinely fresh
  // draft must start there explicitly. Persisted state only tells us we've
  // been here before, in which case the brief's rule applies: resume at
  // firstIncompleteStep (the graph, not the stored step number, is truth).
  useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;
    const persisted = loadPersisted(blueprintId);
    if (persisted?.skipped) { setSkipped(true); return; }
    if (!persisted) { setStep(0); return; }
    setStep(incomplete);
    if (incomplete > 0) toast(t('tour.resumedToast', { n: incomplete + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, blueprintId]);

  useEffect(() => {
    if (!initialized.current) return;
    savePersisted(blueprintId, { step, skipped });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, skipped, blueprintId]);

  const stepDef = TOUR_STEPS[step];
  const stepChecked = stepDef.check(ctx);
  const completed = TOUR_STEPS[8].check(ctx);

  return {
    visible: enabled && !skipped,
    step,
    stepDef,
    stepChecked,
    completed,
    next: () => { if (stepChecked) setStep((s) => (Math.min(8, s + 1) as TourStepId)); },
    previous: () => setStep((s) => (Math.max(0, s - 1) as TourStepId)),
    // The auto-applied patch is guaranteed to satisfy the current step's
    // check on the next render, so this can advance optimistically.
    advanceAfterAutoApply: () => setStep((s) => (Math.min(8, s + 1) as TourStepId)),
    skip: () => setSkipped(true),
  };
}
