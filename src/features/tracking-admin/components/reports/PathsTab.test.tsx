vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number) => String(n),
    dateTime: (d: Date) => d.toISOString(),
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('../../queries/get-plan', () => ({ useTrackingPlanQuery: vi.fn() }));
vi.mock('../../queries/get-reports', () => ({
  usePathsReportQuery: vi.fn(),
  usePathSessionsQuery: vi.fn(),
}));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="skeleton" {...props} />,
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PathsTab } from './PathsTab';
import { usePathsReportQuery, usePathSessionsQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import { toReportRangeBounds, defaultRange } from './report-utils';

const mockedPaths = vi.mocked(usePathsReportQuery);
const mockedSessions = vi.mocked(usePathSessionsQuery);
const mockedPlan = vi.mocked(useTrackingPlanQuery);

const report = {
  sessions: 10,
  columns: [
    { offset: 0, nodes: [{ key: 'checkout_started', sessions: 10 }] },
    { offset: 1, nodes: [{ key: 'a', sessions: 6 }, { key: '__other__', sessions: 4 }] },
  ],
  links: [
    { fromOffset: 0, from: 'checkout_started', to: 'a', sessions: 6 },
    { fromOffset: 0, from: 'checkout_started', to: '__other__', sessions: 4 },
  ],
};

function idle<T>(data?: T) {
  return { data, isLoading: false, isError: false, error: undefined } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedPlan.mockReturnValue({ data: [{ name: 'checkout_started', status: 'live' }] } as never);
  mockedPaths.mockReturnValue(idle());
  mockedSessions.mockReturnValue(idle());
});

function typeAnchor(value: string) {
  fireEvent.change(screen.getByLabelText('reports.paths.anchor'), { target: { value } });
}

describe('PathsTab', () => {
  it('keeps the report request null until Gerar', () => {
    render(<PathsTab />);
    expect(mockedPaths).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('reports.paths.noQuery')).toBeInTheDocument();
  });

  it('builds the request from the form on Gerar', () => {
    render(<PathsTab />);
    const { from, to } = defaultRange();
    typeAnchor('checkout_started');
    fireEvent.click(screen.getByText('reports.paths.directionBoth'));
    fireEvent.change(screen.getByLabelText('reports.paths.steps'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('reports.paths.run'));

    expect(mockedPaths).toHaveBeenLastCalledWith({
      ...toReportRangeBounds(from, to),
      anchor: 'checkout_started',
      direction: 'both',
      steps: 2,
      topK: 8,
    });
  });

  it('accepts a typed page route and rejects a malformed one', () => {
    render(<PathsTab />);
    typeAnchor('page:/events/:id');
    expect(screen.getByText('reports.paths.run')).toBeEnabled();

    typeAnchor('page:events');
    expect(screen.getByText('reports.paths.run')).toBeDisabled();
    expect(screen.getByText('reports.paths.anchorInvalid')).toBeInTheDocument();
  });

  it('blocks a 32-day period and enables a 31-day one', () => {
    render(<PathsTab />);
    typeAnchor('checkout_started');
    const [fromInput, toInput] = Array.from(document.querySelectorAll('input[type="date"]'));
    fireEvent.change(fromInput, { target: { value: '2026-09-01' } });
    fireEvent.change(toInput, { target: { value: '2026-10-02' } });
    expect(screen.getByText('reports.paths.run')).toBeDisabled();
    expect(screen.getByText('reports.paths.rangeTooLong')).toBeInTheDocument();

    fireEvent.change(toInput, { target: { value: '2026-10-01' } });
    expect(screen.getByText('reports.paths.run')).toBeEnabled();
  });

  it('shows the empty message when no session reached the anchor', () => {
    mockedPaths.mockReturnValue(idle({ sessions: 0, columns: [], links: [] }));
    render(<PathsTab />);
    typeAnchor('checkout_started');
    fireEvent.click(screen.getByText('reports.paths.run'));
    expect(screen.getByText('reports.paths.empty:{"anchor":"checkout_started"}')).toBeInTheDocument();
  });

  it('shows the timeout banner on a 422', () => {
    mockedPaths.mockReturnValue({
      data: undefined, isLoading: false, isError: true,
      error: Object.assign(new Error('x'), { isAxiosError: true, response: { status: 422 } }),
    } as never);
    render(<PathsTab />);
    expect(screen.getByText('reports.states.timeout')).toBeInTheDocument();
  });

  describe('with a report', () => {
    beforeEach(() => {
      mockedPaths.mockReturnValue(idle(report));
      mockedSessions.mockReturnValue(idle({
        sessions: [{ sessionId: 's1', anonymousId: 'anon1', userId: null, startedAt: '2026-09-28T22:10:00.000Z', durationSeconds: 75, steps: 4 }],
      }));
    });

    function run() {
      render(<PathsTab />);
      typeAnchor('checkout_started');
      fireEvent.click(screen.getByText('reports.paths.run'));
    }

    it('opens the sessions panel for a clicked node and links to the journey', () => {
      run();
      fireEvent.click(screen.getByRole('button', { name: /^a\b/ }));

      expect(mockedSessions).toHaveBeenLastCalledWith(
        expect.objectContaining({ anchor: 'checkout_started', match: [{ offset: 1, node: 'a' }] }),
      );
      expect(screen.getByRole('link', { name: /reports\.paths\.openSession/ })).toHaveAttribute(
        'href',
        '/dashboard/platform/tracking/sessions/s1?anonymousId=anon1',
      );
    });

    it('matches both ends when a band is clicked', () => {
      run();
      fireEvent.click(screen.getByRole('button', { name: /checkout_started → a/ }));
      expect(mockedSessions).toHaveBeenLastCalledWith(
        expect.objectContaining({ match: [{ offset: 0, node: 'checkout_started' }, { offset: 1, node: 'a' }] }),
      );
    });

    it('does not make the __other__ bucket clickable', () => {
      run();
      expect(screen.queryByRole('button', { name: /reports\.paths\.nodeOther/ })).not.toBeInTheDocument();
    });
  });
});
