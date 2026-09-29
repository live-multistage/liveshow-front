vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number) => String(n),
  }),
}));

vi.mock('../../queries/get-reports', () => ({ useFeaturesReportQuery: vi.fn() }));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Skeleton: (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="skeleton" {...props} />,
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeaturesTab } from './FeaturesTab';
import { useFeaturesReportQuery } from '../../queries/get-reports';
import type { FeaturesReport } from '@live-show/api-contracts';

const mockedFeatures = vi.mocked(useFeaturesReportQuery);

const report: FeaturesReport = {
  features: [
    { feature: 'chat', sessions: 10, users: 5, p50Ms: 20_000, p75Ms: 38_000 },
    { feature: 'replay', sessions: 50, users: 30, p50Ms: 1_520_000, p75Ms: 1_800_000 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedFeatures.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined } as never);
});

describe('FeaturesTab', () => {
  it('req stays null until Rodar', () => {
    render(<FeaturesTab />);
    expect(mockedFeatures).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByText('reports.run'));
    expect(mockedFeatures).toHaveBeenLastCalledWith(expect.objectContaining({}));
  });

  it('sorts by clicking a column header', () => {
    mockedFeatures.mockReturnValue({ data: report, isLoading: false, isError: false, error: undefined } as never);
    render(<FeaturesTab />);
    fireEvent.click(screen.getByText('reports.run'));

    // default: sessions desc -> replay (50) before chat (10)
    let rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('replay');

    // click "feature" header -> sorts alphabetically desc first click
    fireEvent.click(screen.getByText(/^reports\.features\.columns\.feature/));
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('replay'); // r > c, desc

    fireEvent.click(screen.getByText(/^reports\.features\.columns\.feature/));
    rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('chat'); // toggled to asc
  });

  it('shows the timeout banner on a 422 error', () => {
    mockedFeatures.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { isAxiosError: true, response: { status: 422 } },
    } as never);
    render(<FeaturesTab />);
    expect(screen.getByText('reports.states.timeout')).toBeInTheDocument();
  });
});
