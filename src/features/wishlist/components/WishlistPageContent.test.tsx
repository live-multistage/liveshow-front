import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const useWishlistQuery = vi.fn();
vi.mock('../queries/get-wishlist', () => ({
  useWishlistQuery: () => useWishlistQuery(),
}));

const useRecommendedEventsQuery = vi.fn();
vi.mock('@/features/events/queries/use-recommended-events', () => ({
  useRecommendedEventsQuery: () => useRecommendedEventsQuery(),
}));

const useNotificationPreferencesQuery = vi.fn();
const updateMutate = vi.fn();
vi.mock('@/features/account/queries/get-notification-preferences', () => ({
  useNotificationPreferencesQuery: () => useNotificationPreferencesQuery(),
  useUpdateNotificationPreferencesMutation: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock('./WishlistButton', () => ({
  WishlistButton: ({ eventId }: { eventId: string }) => (
    <button type="button">wishlist-{eventId}</button>
  ),
}));

vi.mock('@/features/events/components/public/ShowCard', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => (
    <div>show-card-{show.id}</div>
  ),
}));

vi.mock('@/features/events/utils/event-adapter', () => ({
  eventToShow: (event: { id: string }) => ({ id: event.id, title: `event-${event.id}` }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { WishlistPageContent } from './WishlistPageContent';
import type { WishlistItem } from '../types/wishlist.types';

const LIVE_ITEM: WishlistItem = {
  id: 'ev-live',
  title: 'Rock in Rio',
  status: 'LIVE',
  startsAt: '2026-01-01T20:00:00.000Z',
  endsAt: '2026-01-01T22:00:00.000Z',
  thumbnailUrl: null,
  bannerUrl: null,
  venue: null,
  city: null,
  savedAt: '2026-01-01T10:00:00.000Z',
};

const FINISHED_ITEM: WishlistItem = {
  ...LIVE_ITEM,
  id: 'ev-finished',
  title: 'Show Encerrado',
  status: 'FINISHED',
  startsAt: '2020-01-01T20:00:00.000Z',
  endsAt: '2020-01-01T22:00:00.000Z',
};

const UPCOMING_ITEM: WishlistItem = {
  ...LIVE_ITEM,
  id: 'ev-upcoming',
  title: 'Show Futuro',
  status: 'SCHEDULED',
  startsAt: '2099-01-01T20:00:00.000Z',
  endsAt: '2099-01-01T22:00:00.000Z',
};

function wishlistState(overrides: Record<string, unknown> = {}) {
  useWishlistQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  useWishlistQuery.mockReset();
  useRecommendedEventsQuery.mockReset();
  useNotificationPreferencesQuery.mockReset();
  updateMutate.mockReset();

  useRecommendedEventsQuery.mockReturnValue({ data: undefined, isError: false });
  useNotificationPreferencesQuery.mockReturnValue({ data: { NEWS_PROMOS: false }, isLoading: false });
});

describe('WishlistPageContent', () => {
  it('lists the saved events once loaded, each linking to its event and its own wishlist button', () => {
    wishlistState({ data: [LIVE_ITEM] });
    render(<WishlistPageContent />);

    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rock in Rio/ })).toHaveAttribute(
      'href',
      '/events/ev-live',
    );
    expect(screen.getByText('wishlist-ev-live')).toBeInTheDocument();
  });

  it('shows the empty state for the active tab (all) when there are no favorites', () => {
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    expect(screen.getByText('empty.all.badge')).toBeInTheDocument();
    expect(screen.getByText('empty.all.title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'emptyCta' })).toHaveAttribute('href', '/events');
  });

  it('switches to the live tab copy when "AO VIVO" is selected', () => {
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'tabs.live' }));

    expect(screen.getByText('empty.live.badge')).toBeInTheDocument();
    expect(screen.getByText('empty.live.title')).toBeInTheDocument();
  });

  it('filters out a finished item under the upcoming tab', () => {
    wishlistState({ data: [FINISHED_ITEM, UPCOMING_ITEM] });
    render(<WishlistPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'tabs.upcoming' }));

    expect(screen.getByText('Show Futuro')).toBeInTheDocument();
    expect(screen.queryByText('Show Encerrado')).not.toBeInTheDocument();
  });

  it('toggles the notification preference mutation with NEWS_PROMOS', () => {
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    fireEvent.click(screen.getByRole('button', { name: /notify.off/ }));

    expect(updateMutate).toHaveBeenCalledWith(
      { NEWS_PROMOS: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('disables the notify button while preferences are loading', () => {
    useNotificationPreferencesQuery.mockReturnValue({ data: undefined, isLoading: true });
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    expect(screen.getByRole('button', { name: /notify.off/ })).toBeDisabled();
  });

  it('renders a teaser of 4 recommended shows when the wishlist is empty', () => {
    useRecommendedEventsQuery.mockReturnValue({
      data: { items: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }] },
      isError: false,
    });
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    expect(screen.getAllByText(/show-card-/)).toHaveLength(4);
  });

  it('hides the teaser entirely when the recommended query fails', () => {
    useRecommendedEventsQuery.mockReturnValue({ data: undefined, isError: true });
    wishlistState({ data: [] });
    render(<WishlistPageContent />);

    expect(screen.queryByText(/show-card-/)).not.toBeInTheDocument();
  });

  it('shows placeholders while loading, and neither the empty nor the error state', () => {
    wishlistState({ isLoading: true });
    render(<WishlistPageContent />);

    expect(screen.queryByText('empty.all.badge')).not.toBeInTheDocument();
    expect(screen.queryByText('loadError')).not.toBeInTheDocument();
  });

  /**
   * Falha de carregamento NÃO pode virar o estado vazio: dizer "você não
   * salvou nada" a quem teve a rede falhar é uma mentira.
   */
  it('reports a load failure as an error, never as an empty list', () => {
    wishlistState({ isError: true });
    render(<WishlistPageContent />);

    expect(screen.getByRole('alert')).toHaveTextContent('loadError');
    expect(screen.queryByText('empty.all.badge')).not.toBeInTheDocument();
    expect(screen.queryByText('emptyCta')).not.toBeInTheDocument();
  });

  it('lets the user retry after a failure', () => {
    const refetch = vi.fn();
    wishlistState({ isError: true, refetch });
    render(<WishlistPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(refetch).toHaveBeenCalled();
  });
});
