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
vi.mock('../../queries/get-reports', () => ({ useFunnelReportQuery: vi.fn() }));

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
import { FunnelTab } from './FunnelTab';
import { useFunnelReportQuery } from '../../queries/get-reports';
import { useTrackingPlanQuery } from '../../queries/get-plan';

const mockedFunnel = vi.mocked(useFunnelReportQuery);
const mockedPlan = vi.mocked(useTrackingPlanQuery);

beforeEach(() => {
  vi.clearAllMocks();
  mockedPlan.mockReturnValue({ data: [{ name: 'checkout_started', status: 'live' }, { name: 'order_paid', status: 'live' }] } as never);
  mockedFunnel.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined } as never);
});

function selectAllSteps(container: HTMLElement) {
  const selects = Array.from(container.querySelectorAll('select')).slice(0, -1); // last select is the unit toggle
  selects.forEach((s) => fireEvent.change(s, { target: { value: 'checkout_started' } }));
}

describe('FunnelTab', () => {
  it('caps steps at 8 and floors them at 2', () => {
    const { container } = render(<FunnelTab />);

    // starts with 2 steps, no remove buttons (min reached)
    expect(screen.queryAllByRole('button', { name: 'remove' })).toHaveLength(0);

    while (screen.queryByText('reports.funnels.addStep')) {
      fireEvent.click(screen.getByText('reports.funnels.addStep'));
    }
    // capped at 8 steps -> add link disappears
    expect(screen.queryByText('reports.funnels.addStep')).not.toBeInTheDocument();
    expect(container.querySelectorAll('select').length).toBe(8 + 1); // + unit select

    while (screen.queryAllByRole('button', { name: 'remove' }).length > 0) {
      fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[0]);
    }
    // floored at 2 steps -> remove buttons disappear again
    expect(screen.queryAllByRole('button', { name: 'remove' })).toHaveLength(0);
    expect(container.querySelectorAll('select').length).toBe(2 + 1);
  });

  it('computes windowMinutes from the unit and keeps req null until Rodar', () => {
    const { container } = render(<FunnelTab />);
    selectAllSteps(container);

    expect(mockedFunnel).toHaveBeenLastCalledWith(null);

    const unitSelect = container.querySelectorAll('select')[2];
    fireEvent.change(unitSelect, { target: { value: 'dias' } });
    const windowInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(windowInput, { target: { value: '2' } });

    fireEvent.click(screen.getByText('reports.run'));

    expect(mockedFunnel).toHaveBeenLastCalledWith(expect.objectContaining({ windowMinutes: 2880 }));
  });

  it('disables Rodar and shows the inline error when the window exceeds the unit max', () => {
    const { container } = render(<FunnelTab />);
    selectAllSteps(container);

    const windowInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(windowInput, { target: { value: '99999' } });

    expect(screen.getByText('reports.funnels.windowMaxError:{"max":720}')).toBeInTheDocument();
    expect(screen.getByText('reports.run')).toBeDisabled();
  });

  it('disables Rodar and shows the range error when the range is more than 90 days', () => {
    const { container } = render(<FunnelTab />);
    const [fromInput, toInput] = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-06-01' } });

    expect(screen.getByText('reports.states.rangeTooLong')).toBeInTheDocument();
    expect(screen.getByText('reports.run')).toBeDisabled();
  });
});
