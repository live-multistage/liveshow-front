import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SeriesOrgResponse, SeriesResponse } from '../../types/series.types';
import { SeriesDetailContent } from './SeriesDetailContent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

vi.mock('./SeriesForm', () => ({ SeriesForm: () => <div data-testid="series-form" /> }));
vi.mock('./EpisodesTable', () => ({ EpisodesTable: () => <div data-testid="episodes-table" /> }));
vi.mock('./SeasonPassProducts', () => ({
  SeasonPassProducts: () => <div data-testid="season-pass-products" />,
}));

const useSeriesQuery = vi.fn();
const useOrgSeriesQuery = vi.fn();
vi.mock('../../queries/series.queries', () => ({
  useSeriesQuery: (...args: unknown[]) => useSeriesQuery(...args),
  useOrgSeriesQuery: (...args: unknown[]) => useOrgSeriesQuery(...args),
}));

const pauseMutate = vi.fn();
const resumeMutate = vi.fn();
const endMutate = vi.fn();
const materializeMutate = vi.fn();
vi.mock('../../mutations/series.mutations', () => ({
  usePauseSeriesMutation: () => ({ mutate: pauseMutate, isPending: false }),
  useResumeSeriesMutation: () => ({ mutate: resumeMutate, isPending: false }),
  useEndSeriesMutation: () => ({ mutate: endMutate, isPending: false }),
  useMaterializeSeriesMutation: () => ({ mutate: materializeMutate, isPending: false }),
}));

const series = (overrides: Partial<SeriesResponse> = {}): SeriesResponse => ({
  id: 'series-1',
  organizationId: 'org-1',
  slug: 'quinta-do-rock',
  name: 'Quinta do Rock',
  description: null,
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  dtstart: '2026-01-01T23:00:00.000Z',
  timezone: 'America/Sao_Paulo',
  durationMin: 90,
  horizonWeeks: 4,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// templateEventId only ever comes back on the org list — GET /series/:slug
// (useSeriesQuery, mocked above) never carries it anymore.
const orgSeries = (overrides: Partial<SeriesOrgResponse> = {}): SeriesOrgResponse => ({
  ...series(),
  templateEventId: 'evt-template-1',
  ...overrides,
});

describe('SeriesDetailContent', () => {
  beforeEach(() => {
    pauseMutate.mockReset();
    resumeMutate.mockReset();
    endMutate.mockReset();
    materializeMutate.mockReset();
    useOrgSeriesQuery.mockReturnValue({ data: [orgSeries()] });
  });

  it('renders the series name, status, episodes and season passes', () => {
    useSeriesQuery.mockReturnValue({ data: series(), isLoading: false });

    render(<SeriesDetailContent slug="quinta-do-rock" />);

    expect(screen.getByText('Quinta do Rock')).toBeInTheDocument();
    expect(screen.getByText('dashboard.status.ACTIVE')).toBeInTheDocument();
    expect(screen.getByTestId('episodes-table')).toBeInTheDocument();
    expect(screen.getByTestId('season-pass-products')).toBeInTheDocument();
  });

  it('links to the template event streams and ticket dashboard', () => {
    useSeriesQuery.mockReturnValue({ data: series(), isLoading: false });

    render(<SeriesDetailContent slug="quinta-do-rock" />);

    expect(screen.getByText('dashboard.configureCameras').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/dashboard/streams?eventId=evt-template-1'),
    );
    expect(screen.getByText('dashboard.templateTickets').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/events/evt-template-1',
    );
  });

  it('offers pause for an active series and resume for a paused one', () => {
    useSeriesQuery.mockReturnValue({ data: series({ status: 'ACTIVE' }), isLoading: false });
    const { rerender } = render(<SeriesDetailContent slug="quinta-do-rock" />);

    fireEvent.click(screen.getByText('dashboard.pause'));
    expect(pauseMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'series-1', organizationId: 'org-1', slug: 'quinta-do-rock' }),
    );
    expect(screen.queryByText('dashboard.resume')).not.toBeInTheDocument();

    useSeriesQuery.mockReturnValue({ data: series({ status: 'PAUSED' }), isLoading: false });
    rerender(<SeriesDetailContent slug="quinta-do-rock" />);

    fireEvent.click(screen.getByText('dashboard.resume'));
    expect(resumeMutate).toHaveBeenCalled();
    expect(screen.queryByText('dashboard.pause')).not.toBeInTheDocument();
  });

  it('requires confirmation before ending the series, and does not mutate on cancel', () => {
    useSeriesQuery.mockReturnValue({ data: series({ status: 'ACTIVE' }), isLoading: false });

    render(<SeriesDetailContent slug="quinta-do-rock" />);
    fireEvent.click(screen.getByText('dashboard.end'));

    // The dialog is open — clicking "end" alone must not have mutated yet.
    expect(endMutate).not.toHaveBeenCalled();
    expect(screen.getByText('dashboard.endTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('dashboard.cancel'));
    expect(endMutate).not.toHaveBeenCalled();
  });

  it('ends the series once the confirmation dialog is confirmed', () => {
    useSeriesQuery.mockReturnValue({ data: series({ status: 'ACTIVE' }), isLoading: false });

    render(<SeriesDetailContent slug="quinta-do-rock" />);
    fireEvent.click(screen.getByText('dashboard.end'));
    fireEvent.click(screen.getByText('dashboard.confirm'));

    expect(endMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'series-1', organizationId: 'org-1', slug: 'quinta-do-rock' }),
    );
  });

  it('triggers materialize on demand', () => {
    useSeriesQuery.mockReturnValue({ data: series(), isLoading: false });

    render(<SeriesDetailContent slug="quinta-do-rock" />);
    fireEvent.click(screen.getByText('dashboard.materialize'));

    expect(materializeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'series-1' }),
    );
  });

  it('shows notFound when the series does not exist', () => {
    useSeriesQuery.mockReturnValue({ data: undefined, isLoading: false });

    render(<SeriesDetailContent slug="ghost" />);

    expect(screen.getByText('notFound')).toBeInTheDocument();
  });
});
