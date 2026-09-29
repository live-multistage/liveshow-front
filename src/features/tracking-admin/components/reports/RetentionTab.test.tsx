vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number, opts?: { style?: string; maximumFractionDigits?: number }) =>
      opts?.style === 'percent' ? `${Math.round(n * 100)}%` : String(n),
  }),
}));

vi.mock('../../queries/get-plan', () => ({ useTrackingPlanQuery: vi.fn() }));
vi.mock('../../queries/get-reports', () => ({ useRetentionReportQuery: vi.fn() }));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SimpleCustomSelect: ({ value, onValueChange, options }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="skeleton" {...props} />,
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetentionTab } from './RetentionTab';
import { useRetentionReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';
import type { RetentionReport } from '@live-show/api-contracts';

const mockedRetention = vi.mocked(useRetentionReportQuery);
const mockedPlan = vi.mocked(useTrackingPlanQuery);

const report: RetentionReport = {
  cohorts: [
    { week: '2026-01-05', size: 100, returned: [50] }, // only week 1 available, week 2/3 missing
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedPlan.mockReturnValue({ data: [{ name: 'signup', status: 'live' }, { name: 'purchase', status: 'live' }] } as never);
  mockedRetention.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined } as never);
});

function runQuery(container: HTMLElement) {
  const selects = container.querySelectorAll('select');
  fireEvent.change(selects[0], { target: { value: 'signup' } });
  fireEvent.change(selects[1], { target: { value: 'purchase' } });
  fireEvent.click(screen.getByText('reports.run'));
}

describe('RetentionTab', () => {
  it('req stays null until Rodar, then runs with the requested weeks', () => {
    const { container } = render(<RetentionTab />);
    expect(mockedRetention).toHaveBeenLastCalledWith(null);

    const weeksInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(weeksInput, { target: { value: '3' } });
    runQuery(container);

    expect(mockedRetention).toHaveBeenLastCalledWith(expect.objectContaining({ weeks: 3 }));
  });

  it('renders S0 at 100% and returned weeks as a % of cohort size, with missing weeks shown empty', () => {
    mockedRetention.mockReturnValue({ data: report, isLoading: false, isError: false, error: undefined } as never);
    const { container } = render(<RetentionTab />);

    const weeksInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(weeksInput, { target: { value: '3' } });
    runQuery(container);

    expect(screen.getByText('S0')).toBeInTheDocument();
    // S0 is 100%
    const row = screen.getByText(/cohortLabel/).closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('100%');
    // S1 = 50/100 = 50%
    expect(row).toHaveTextContent('50%');
    // S2/S3 have no data -> empty dashed cells (no percent text for them)
    const cells = row.querySelectorAll('td');
    expect(cells.length).toBe(2 /* cohort + users */ + 1 /* S0 */ + 3 /* S1..S3 */);
    expect(cells[cells.length - 1].textContent).toBe('');
    expect(cells[cells.length - 2].textContent).toBe('');
  });

  it('disables Rodar and shows the range error when the range is more than 90 days', () => {
    const { container } = render(<RetentionTab />);
    const [fromInput, toInput] = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-01' } });

    expect(screen.getByText('reports.states.rangeTooLong')).toBeInTheDocument();
    expect(screen.getByText('reports.run')).toBeDisabled();
  });
});
