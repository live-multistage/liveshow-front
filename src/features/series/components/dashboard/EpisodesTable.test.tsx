import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SeriesEpisodeDetail } from '../../types/series.types';
import { EpisodesTable } from './EpisodesTable';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const useSeriesEpisodesQuery = vi.fn();
vi.mock('../../queries/series.queries', () => ({
  useSeriesEpisodesQuery: (...args: unknown[]) => useSeriesEpisodesQuery(...args),
}));

const reattachMutate = vi.fn();
vi.mock('../../mutations/series.mutations', () => ({
  useReattachEpisodeMutation: () => ({ mutate: reattachMutate, isPending: false }),
}));

const episode = (overrides: Partial<SeriesEpisodeDetail> = {}): SeriesEpisodeDetail => ({
  id: 'evt-2',
  title: 'Quinta do Rock — 08/01',
  startsAt: '2026-01-08T23:00:00.000Z',
  endsAt: '2026-01-09T00:30:00.000Z',
  status: 'SCHEDULED',
  detachedFromSeries: false,
  thumbnailUrl: null,
  ...overrides,
});

describe('EpisodesTable', () => {
  beforeEach(() => {
    reattachMutate.mockReset();
  });

  it('lists every episode with its date, status and a link to its event dashboard page', () => {
    useSeriesEpisodesQuery.mockReturnValue({ data: [episode()], isLoading: false });

    render(<EpisodesTable seriesId="series-1" />);

    expect(screen.getByText('dashboard.episodeStatus.SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('Quinta do Rock — 08/01').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/events/evt-2',
    );
  });

  it('flags a detached episode and offers to reattach it', () => {
    useSeriesEpisodesQuery.mockReturnValue({
      data: [episode({ id: 'evt-3', detachedFromSeries: true })],
      isLoading: false,
    });

    render(<EpisodesTable seriesId="series-1" />);

    expect(screen.getByText('dashboard.detached')).toBeInTheDocument();
    fireEvent.click(screen.getByText('dashboard.reattach'));

    expect(reattachMutate).toHaveBeenCalledWith({ seriesId: 'series-1', eventId: 'evt-3' });
  });

  it('does not show the reattach action for an attached episode', () => {
    useSeriesEpisodesQuery.mockReturnValue({ data: [episode()], isLoading: false });

    render(<EpisodesTable seriesId="series-1" />);

    expect(screen.queryByText('dashboard.reattach')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard.detached')).not.toBeInTheDocument();
  });

  it('shows the empty hint when the series has no episodes yet', () => {
    useSeriesEpisodesQuery.mockReturnValue({ data: [], isLoading: false });

    render(<EpisodesTable seriesId="series-1" />);

    expect(screen.getByText('dashboard.empty')).toBeInTheDocument();
  });
});
