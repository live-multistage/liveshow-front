vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number, opts?: { style?: string }) =>
      opts?.style === 'percent' ? `${(n * 100).toFixed(1)}%` : String(n),
  }),
}));

vi.mock('../../queries/get-plan', () => ({ useTrackingPlanQuery: vi.fn() }));
vi.mock('../../queries/get-reports', () => ({ useExploreReportQuery: vi.fn() }));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Chip: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
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
import { ExploreTab } from './ExploreTab';
import { useExploreReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';

const mockedExplore = vi.mocked(useExploreReportQuery);
const mockedPlan = vi.mocked(useTrackingPlanQuery);

beforeEach(() => {
  vi.clearAllMocks();
  mockedPlan.mockReturnValue({ data: [{ name: 'checkout_started', status: 'live' }] } as never);
  mockedExplore.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined } as never);
});

describe('ExploreTab', () => {
  it('disables Rodar and shows the error when the range is more than 90 days', () => {
    const { container } = render(<ExploreTab />);
    const [fromInput, toInput] = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-01' } }); // 151 days

    expect(screen.getByText('reports.states.rangeTooLong')).toBeInTheDocument();
    expect(screen.getByText('reports.run')).toBeDisabled();
  });

  it('keeps req null until Rodar is clicked, then runs with the selected event', () => {
    render(<ExploreTab />);

    expect(mockedExplore).toHaveBeenLastCalledWith(null);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'checkout_started' } });
    expect(mockedExplore).toHaveBeenLastCalledWith(null);

    fireEvent.click(screen.getByText('reports.run'));
    expect(mockedExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: 'checkout_started', interval: 'day' }),
    );
  });

  it('sends inclusive ISO bounds for the picked from/to', () => {
    const { container } = render(<ExploreTab />);
    const [fromInput, toInput] = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

    fireEvent.change(fromInput, { target: { value: '2026-09-01' } });
    fireEvent.change(toInput, { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'checkout_started' } });
    fireEvent.click(screen.getByText('reports.run'));

    expect(mockedExplore).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' }),
    );
  });

  it('shows the timeout banner on a 422 report_timeout error', () => {
    mockedExplore.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { isAxiosError: true, response: { status: 422 } },
    } as never);

    render(<ExploreTab />);

    expect(screen.getByText('reports.states.timeout')).toBeInTheDocument();
  });
});
