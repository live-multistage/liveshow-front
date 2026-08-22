import { describe, it, expect, vi } from 'vitest';

// This file exercises the REAL cart mutation (useAddToCartMutation), unlike
// SeriesPageContent.test.tsx which mocks '@/features/cart' wholesale — the
// point here is proving the season-pass buy button surfaces the existing
// error toast on a failed add, not a raw crash.
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
  ShowCard: () => null,
}));
vi.mock('@/features/account', () => ({ useAuth: () => ({ isLoggedIn: true }) }));

const { toastErrorSpy } = vi.hoisted(() => ({ toastErrorSpy: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastErrorSpy, success: vi.fn() } }));

vi.mock('@/features/cart/services/cart.service', () => ({
  cartService: {
    get: vi.fn().mockResolvedValue({ items: [], totals: { subtotal: 0, lines: [], total: 0 } }),
    add: vi.fn().mockRejectedValue(new Error('network down')),
  },
}));

const useSeriesQueryMock = vi.fn();
vi.mock('../queries/series.queries', () => ({
  useSeriesQuery: (slug: string) => useSeriesQueryMock(slug),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SeriesPageContent } from './SeriesPageContent';
import type { SeriesDetail } from '../types/series.types';

function makeSeries(): SeriesDetail {
  return {
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
    templateEventId: 'evt-template-1',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nextEpisode: null,
    upcoming: [],
    replays: [],
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
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SeriesPageContent — season pass buy errors', () => {
  it('shows the existing error toast (no crash) when adding a season pass fails', async () => {
    useSeriesQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSeries(),
    });

    renderWithClient(<SeriesPageContent slug="quinta-do-rock" />);

    fireEvent.click(screen.getByText('buySeasonPass'));

    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText('buySeasonPass')).toBeInTheDocument();
  });
});
