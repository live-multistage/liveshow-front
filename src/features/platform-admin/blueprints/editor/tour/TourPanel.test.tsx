vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = () => true;
    return t;
  },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CATALOG_MAP } from '../__fixtures__/catalog';
import { TOUR_STEPS } from './tourSteps';
import { TourPanel } from './TourPanel';
import type { UseTourResult } from './useTour';

function baseTour(overrides: Partial<UseTourResult> = {}): UseTourResult {
  return {
    visible: true,
    step: 0,
    stepDef: TOUR_STEPS[0],
    stepChecked: true,
    completed: false,
    next: vi.fn(),
    previous: vi.fn(),
    advanceAfterAutoApply: vi.fn(),
    skip: vi.fn(),
    ...overrides,
  };
}

function renderPanel(tour: UseTourResult, extra: Partial<Parameters<typeof TourPanel>[0]> = {}) {
  return render(
    <TourPanel
      tour={tour}
      catalog={CATALOG_MAP}
      blueprintId="b1"
      active={false}
      onDoForMe={vi.fn()}
      onActivate={vi.fn()}
      activating={false}
      {...extra}
    />,
  );
}

describe('TourPanel', () => {
  it('renders nothing when the tour is not visible', () => {
    const { container } = renderPanel(baseTour({ visible: false }));
    expect(container).toBeEmptyDOMElement();
  });

  it('step 0 shows only Próximo, no type chip and no checklist', () => {
    renderPanel(baseTour({ step: 0, stepDef: TOUR_STEPS[0], stepChecked: true }));
    expect(screen.getByText(TOUR_STEPS[0].titleKey.replace('platformAdmin.blueprints.', ''))).toBeInTheDocument();
    expect(screen.queryByText('tour.previous')).not.toBeInTheDocument();
    expect(screen.queryByText('tour.doForMe')).not.toBeInTheDocument();
    expect(screen.queryByText('tour.whatToFill')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.next' })).toBeEnabled();
  });

  it('a pending step (2) shows Fazer por mim and disables Próximo', () => {
    renderPanel(baseTour({ step: 2, stepDef: TOUR_STEPS[2], stepChecked: false }));
    expect(screen.getByRole('button', { name: 'tour.doForMe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.next' })).toBeDisabled();
    expect(screen.getByText('tour.whatToFill')).toBeInTheDocument();
  });

  it('a completed step shows the green check and enables Próximo', () => {
    renderPanel(baseTour({ step: 2, stepDef: TOUR_STEPS[2], stepChecked: true }));
    expect(screen.getByRole('button', { name: 'tour.next' })).toBeEnabled();
    // The check badge has no accessible name of its own; assert via the icon's presence next to the step label.
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the hint block for a step with a hintKey', () => {
    renderPanel(baseTour({ step: 1, stepDef: TOUR_STEPS[1], stepChecked: false }));
    expect(screen.getByText(/tour\.hint:/)).toBeInTheDocument();
  });

  it('hides the hint block for a step without a hintKey (e.g. step 4)', () => {
    renderPanel(baseTour({ step: 4, stepDef: TOUR_STEPS[4], stepChecked: false }));
    expect(screen.queryByText(/tour\.hint:/)).not.toBeInTheDocument();
  });

  it('step 8 shows no Fazer por mim / Próximo, only Anterior', () => {
    renderPanel(baseTour({ step: 8, stepDef: TOUR_STEPS[8], stepChecked: false }));
    expect(screen.getByRole('button', { name: 'tour.previous' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'tour.doForMe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'tour.next' })).not.toBeInTheDocument();
  });

  it('clicking the close button or Pular tutorial calls skip', async () => {
    const skip = vi.fn();
    renderPanel(baseTour({ skip }));
    for (const btn of screen.getAllByRole('button', { name: 'tour.skip' })) btn.click();
    expect(skip).toHaveBeenCalledTimes(2);
  });

  it('renders the B2 completion panel when active, with Ver execuções and Fechar', () => {
    renderPanel(baseTour({ completed: true }), { active: true });
    expect(screen.getByText('tour.completion.activeTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.viewRuns' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'tour.activate' })).not.toBeInTheDocument();
  });

  it('renders the B3 completion panel when published but not active, with Ativar', async () => {
    const onActivate = vi.fn();
    renderPanel(baseTour({ completed: true }), { active: false, onActivate });
    expect(screen.getByText('tour.completion.pendingTitle')).toBeInTheDocument();
    const activateBtn = screen.getByRole('button', { name: 'tour.activate' });
    activateBtn.click();
    expect(onActivate).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'tour.viewRuns' })).not.toBeInTheDocument();
  });
});
