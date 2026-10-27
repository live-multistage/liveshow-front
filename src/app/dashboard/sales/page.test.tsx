import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/analytics/hooks/use-my-sales', () => ({ useGetMySalesQuery: vi.fn() }));
vi.mock('@/features/analytics/hooks/use-event-sales', () => ({
  useGetEventSalesQuery: vi.fn(() => ({
    data: {
      events: [
        {
          eventId: 'ev-1', eventTitle: 'Show de Outubro', currency: 'BRL', startsAt: '2026-10-01T20:00:00.000Z',
          venue: null, city: null, thumbnailUrl: null, totalOrders: 9, totalRevenue: 900,
        },
      ],
    },
    isLoading: false,
  })),
}));
vi.mock('@/shared/charts/LineChart', () => ({ LineChart: () => <svg data-testid="line-chart" /> }));

import { fireEvent, render, screen } from '@testing-library/react';
import DashboardSalesPage from './page';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import { useGetEventSalesQuery } from '@/features/analytics/hooks/use-event-sales';
import type { SalesByCurrency } from '@/features/analytics/types/sales.types';

const SALES: SalesByCurrency[] = [
  {
    currency: 'BRL',
    summary: { totalOrders: 9, totalRevenue: 900, data: [{ date: '2026-10', orders: 9, revenue: 900 }] },
    byEvent: [],
  },
];

type QueryResult = ReturnType<typeof useGetMySalesQuery>;

function mockSales(result: { data: SalesByCurrency[] | undefined; isLoading: boolean; isPlaceholderData?: boolean }) {
  vi.mocked(useGetMySalesQuery).mockReturnValue({ isPlaceholderData: false, ...result } as unknown as QueryResult);
}

describe('DashboardSalesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the metric cards and chart as skeletons on the first load', () => {
    mockSales({ data: undefined, isLoading: true });
    render(<DashboardSalesPage />);

    expect(screen.getByText('TOTAL DE VENDAS')).toBeInTheDocument();
    expect(screen.getByText('VOLUME DE VENDAS')).toBeInTheDocument();
    expect(screen.getAllByTestId('metric-skeleton')).toHaveLength(3);
    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
  });

  it('keeps the cards and chart mounted while another granularity loads', () => {
    mockSales({ data: SALES, isLoading: false });
    render(<DashboardSalesPage />);
    expect(screen.getByText('TOTAL DE VENDAS').closest('[aria-busy]')).toHaveTextContent('9');

    // keepPreviousData: the new key has no data yet, so the previous one is
    // served as a placeholder while it refetches.
    mockSales({ data: SALES, isLoading: false, isPlaceholderData: true });
    fireEvent.click(screen.getByRole('button', { name: 'Dia' }));

    expect(vi.mocked(useGetMySalesQuery)).toHaveBeenLastCalledWith('day');
    expect(screen.getByText('TOTAL DE VENDAS').closest('[aria-busy]')).toHaveTextContent('9');
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByText('TOTAL DE VENDAS').closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the empty dashboard when there are no sales', () => {
    mockSales({ data: [], isLoading: false });
    render(<DashboardSalesPage />);

    expect(screen.getByText('TOTAL DE VENDAS')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
  });

  it('refetches the per-event table with the toggled granularity without unmounting it', () => {
    mockSales({ data: SALES, isLoading: false });
    render(<DashboardSalesPage />);
    const row = screen.getByText('Show de Outubro');
    expect(vi.mocked(useGetEventSalesQuery)).toHaveBeenLastCalledWith('month');

    fireEvent.click(screen.getByRole('button', { name: 'Dia' }));

    expect(vi.mocked(useGetEventSalesQuery)).toHaveBeenLastCalledWith('day');
    expect(screen.getByText('Show de Outubro')).toBe(row);
  });
});
