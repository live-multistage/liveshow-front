vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = (key: string) => key.startsWith('runOutcome.') && ['runOutcome.WAITING', 'runOutcome.SENT'].includes(key);
    return t;
  },
  useFormatter: () => ({ dateTime: (d: Date) => d.toISOString() }),
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlueprintRunDto } from '@live-show/api-contracts';
import { RunDrawer } from './RunDrawer';

const baseRun: BlueprintRunDto = {
  id: 'run_0123456789', versionId: 'v2', version: 2, status: 'COMPLETED', currentNodeId: null,
  wakeAt: null, errorCode: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z',
  steps: [
    { nodeId: 'e1', nodeKey: 'orders.paid', status: 'OK', outcome: 'WAITING', errorCode: null, startedAt: '2026-10-01T10:00:00Z', finishedAt: '2026-10-01T10:00:01Z' },
    { nodeId: 'e7', nodeKey: 'email.send', status: 'FAILED', outcome: 'weird_unmapped_outcome', errorCode: 'TRANSIENT_EXHAUSTED', startedAt: '2026-10-01T10:00:02Z', finishedAt: null },
  ],
};

describe('RunDrawer', () => {
  it('renders the step timeline with translated outcomes and a fallback for unmapped ones', () => {
    render(<RunDrawer blueprintId="b1" run={baseRun} onClose={vi.fn()} />);
    expect(screen.getByText('runOutcome.WAITING')).toBeInTheDocument();
    expect(screen.getByText('weird_unmapped_outcome')).toBeInTheDocument();
    expect(screen.getByText('TRANSIENT_EXHAUSTED')).toBeInTheDocument();
  });

  it('shows the wake time only when waiting', () => {
    const waiting: BlueprintRunDto = { ...baseRun, status: 'WAITING', wakeAt: '2026-10-02T18:00:00Z' };
    render(<RunDrawer blueprintId="b1" run={waiting} onClose={vi.fn()} />);
    expect(screen.getByText(/drawer.wakeAt/)).toBeInTheDocument();
  });

  it('shows the cancelled banner and never renders personal data (only ids/keys/timings)', () => {
    const cancelled: BlueprintRunDto = { ...baseRun, status: 'CANCELLED', steps: [] };
    render(<RunDrawer blueprintId="b1" run={cancelled} onClose={vi.fn()} />);
    expect(screen.getByText('drawer.cancelledBanner')).toBeInTheDocument();
  });

  it('links "Abrir no editor" to the run version and current node', () => {
    const withNode: BlueprintRunDto = { ...baseRun, currentNodeId: 'e5' };
    render(<RunDrawer blueprintId="b1" run={withNode} onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'drawer.openEditor' })).toHaveAttribute(
      'href', '/dashboard/platform/blueprints/b1/editor?version=v2&node=e5',
    );
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<RunDrawer blueprintId="b1" run={baseRun} onClose={onClose} />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalled();
  });
});
