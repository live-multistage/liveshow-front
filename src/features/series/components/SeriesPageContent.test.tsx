import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/features/events/components/public/ShowCard', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => (
    <div data-testid="show-card" data-id={show.id}>{show.title}</div>
  ),
}));

const useAddToCartMutationMock = vi.fn();
vi.mock('@/features/cart', () => ({
  useAddToCartMutation: () => useAddToCartMutationMock(),
  useCartQuery: () => ({ data: { items: [] } }),
}));

const useAuthMock = vi.fn();
vi.mock('@/features/account', () => ({ useAuth: () => useAuthMock() }));

const useSeriesQueryMock = vi.fn();
vi.mock('../queries/series.queries', () => ({
  useSeriesQuery: (slug: string) => useSeriesQueryMock(slug),
}));

import { render, screen } from '@testing-library/react';
import { SeriesPageContent } from './SeriesPageContent';
import type { SeriesDetail } from '../types/series.types';

function makeSeries(overrides: Partial<SeriesDetail> = {}): SeriesDetail {
  return {
    id: 'series-1',
    organizationId: 'org-1',
    slug: 'quinta-do-rock',
    name: 'Quinta do Rock',
    description: 'Show semanal de rock',
    rrule: 'FREQ=WEEKLY;BYDAY=TH',
    dtstart: '2026-01-01T23:00:00.000Z',
    timezone: 'America/Sao_Paulo',
    durationMin: 90,
    horizonWeeks: 4,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextEpisode: null,
    upcoming: [],
    replays: [],
    seasonPasses: [],
    ...overrides,
  };
}

describe('SeriesPageContent', () => {
  beforeEach(() => {
    useAddToCartMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useAuthMock.mockReturnValue({ isLoggedIn: false });
  });

  it('shows a loading state while the series is fetching', () => {
    useSeriesQueryMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    render(<SeriesPageContent slug="quinta-do-rock" />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows a not-found state when the series fails to load', () => {
    useSeriesQueryMock.mockReturnValue({ isLoading: false, isError: true, data: undefined, refetch: vi.fn() });

    render(<SeriesPageContent slug="unknown" />);

    expect(screen.getByText('notFound')).toBeInTheDocument();
  });

  it('renders the next episode with buy CTAs', () => {
    useSeriesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSeries({
        nextEpisode: {
          id: 'evt-2',
          title: 'Episódio 4',
          startsAt: '2026-01-08T23:00:00.000Z',
          endsAt: '2026-01-09T01:00:00.000Z',
          status: 'PUBLISHED',
          detachedFromSeries: false,
          thumbnailUrl: null,
        },
        seasonPasses: [
          {
            id: 'pass-1',
            seriesId: 'series-1',
            name: 'Temporada completa',
            description: '',
            price: 199,
            currency: 'BRL',
            capabilities: ['LIVE_VIEW'],
            camerasLimit: null,
            allowedStageIds: [],
            capacity: null,
          },
        ],
      }),
    });

    render(<SeriesPageContent slug="quinta-do-rock" />);

    expect(screen.getByRole('heading', { name: 'Quinta do Rock' })).toBeInTheDocument();
    expect(screen.getByText('Episódio 4')).toBeInTheDocument();
    expect(screen.getByText('buyEpisode').closest('a')).toHaveAttribute('href', '/events/evt-2');
    expect(screen.getAllByText('buySeasonPass').length).toBeGreaterThan(0);
  });

  it('renders the upcoming episode list linking to each event page', () => {
    useSeriesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSeries({
        upcoming: [
          {
            id: 'evt-3',
            title: 'Episódio 5',
            startsAt: '2026-01-15T23:00:00.000Z',
            endsAt: '2026-01-16T01:00:00.000Z',
            status: 'PUBLISHED',
            detachedFromSeries: false,
            thumbnailUrl: null,
          },
        ],
      }),
    });

    render(<SeriesPageContent slug="quinta-do-rock" />);

    expect(screen.getByText('Episódio 5').closest('a')).toHaveAttribute('href', '/events/evt-3');
  });

  it('drops the next episode from the upcoming list to avoid showing it twice', () => {
    useSeriesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSeries({
        nextEpisode: {
          id: 'evt-2',
          title: 'Episódio 4',
          startsAt: '2026-01-08T23:00:00.000Z',
          endsAt: '2026-01-09T01:00:00.000Z',
          status: 'SCHEDULED',
          detachedFromSeries: false,
          thumbnailUrl: null,
        },
        upcoming: [
          {
            id: 'evt-2',
            title: 'Episódio 4',
            startsAt: '2026-01-08T23:00:00.000Z',
            endsAt: '2026-01-09T01:00:00.000Z',
            status: 'SCHEDULED',
            detachedFromSeries: false,
            thumbnailUrl: null,
          },
          {
            id: 'evt-3',
            title: 'Episódio 5',
            startsAt: '2026-01-15T23:00:00.000Z',
            endsAt: '2026-01-16T01:00:00.000Z',
            status: 'SCHEDULED',
            detachedFromSeries: false,
            thumbnailUrl: null,
          },
        ],
      }),
    });

    render(<SeriesPageContent slug="quinta-do-rock" />);

    // "Episódio 4" still shows once, in the next-episode hero — just not
    // duplicated in the upcoming list below it.
    expect(screen.getAllByText('Episódio 4')).toHaveLength(1);
    expect(screen.getByText('Episódio 5')).toBeInTheDocument();
  });

  it('renders replays using ShowCard', () => {
    useSeriesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSeries({
        replays: [
          {
            id: 'evt-1',
            title: 'Episódio 1',
            startsAt: '2025-12-01T23:00:00.000Z',
            endsAt: '2025-12-02T01:00:00.000Z',
            status: 'FINISHED',
            detachedFromSeries: false,
            thumbnailUrl: null,
          },
        ],
      }),
    });

    render(<SeriesPageContent slug="quinta-do-rock" />);

    const card = screen.getByTestId('show-card');
    expect(card).toHaveAttribute('data-id', 'evt-1');
  });
});
