import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SeriesTicketProduct } from '../../types/series.types';
import { SeasonPassProducts } from './SeasonPassProducts';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const useSeriesTicketProductsQuery = vi.fn();
vi.mock('../../queries/series.queries', () => ({
  useSeriesTicketProductsQuery: (...args: unknown[]) => useSeriesTicketProductsQuery(...args),
}));

const editTicketSectionProps = vi.fn();
vi.mock('@/features/events/components/dashboard/EditTicketSection', () => ({
  EditTicketSection: (props: unknown) => {
    editTicketSectionProps(props);
    return <div data-testid="edit-ticket-section" />;
  },
}));

const product = (overrides: Partial<SeriesTicketProduct> = {}): SeriesTicketProduct => ({
  id: 'prod-1',
  seriesId: 'series-1',
  name: 'Passe da temporada',
  description: 'Acesso a todos os episódios',
  price: 200,
  currency: 'BRL',
  capabilities: ['LIVE_VIEW'],
  camerasLimit: null,
  allowedStageIds: [],
  capacity: 100,
  sold: 30,
  immutable: false,
  ...overrides,
});

describe('SeasonPassProducts', () => {
  beforeEach(() => {
    editTicketSectionProps.mockReset();
    useSeriesTicketProductsQuery.mockReturnValue({ data: [product()] });
  });

  it('forwards the seriesId and the template event id (for stages) to the ticket form', () => {
    render(<SeasonPassProducts seriesId="series-1" templateEventId="evt-template-1" />);

    expect(screen.getByTestId('edit-ticket-section')).toBeInTheDocument();
    expect(editTicketSectionProps).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: 'series-1', stagesEventId: 'evt-template-1' }),
    );
  });

  it('derives remaining and soldOut from sold and capacity for each product', () => {
    render(<SeasonPassProducts seriesId="series-1" templateEventId="evt-template-1" />);

    const [{ tickets }] = editTicketSectionProps.mock.calls[0];
    expect(tickets).toEqual([expect.objectContaining({ remaining: 70, soldOut: false })]);
  });

  it('marks a fully sold product as sold out with zero remaining', () => {
    useSeriesTicketProductsQuery.mockReturnValue({
      data: [product({ sold: 100 })],
    });

    render(<SeasonPassProducts seriesId="series-1" templateEventId="evt-template-1" />);

    const [{ tickets }] = editTicketSectionProps.mock.calls[0];
    expect(tickets).toEqual([expect.objectContaining({ remaining: 0, soldOut: true })]);
  });
});
