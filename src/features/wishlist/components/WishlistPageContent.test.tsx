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

vi.mock('./WishlistButton', () => ({
  WishlistButton: ({ eventId }: { eventId: string }) => (
    <button type="button">wishlist-{eventId}</button>
  ),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { WishlistPageContent } from './WishlistPageContent';
import type { WishlistItem } from '../types/wishlist.types';

const ITEM: WishlistItem = {
  id: 'ev-1',
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

function state(overrides: Record<string, unknown> = {}) {
  useWishlistQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => useWishlistQuery.mockReset());

describe('WishlistPageContent', () => {
  it('lists the saved events once loaded, each linking to its event and its own wishlist button', () => {
    state({ data: [ITEM] });
    render(<WishlistPageContent />);

    expect(screen.getByText('Rock in Rio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rock in Rio/ })).toHaveAttribute(
      'href',
      '/events/ev-1',
    );
    expect(screen.getByText('wishlist-ev-1')).toBeInTheDocument();
  });

  it('shows placeholders while loading, and neither the empty nor the error state', () => {
    state({ isLoading: true });
    render(<WishlistPageContent />);

    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.queryByText('loadError')).not.toBeInTheDocument();
  });

  it('invites the user to browse when the list is genuinely empty', () => {
    state({ data: [] });
    render(<WishlistPageContent />);

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'emptyCta' })).toHaveAttribute('href', '/events');
  });

  /**
   * Falha de carregamento NÃO pode virar o estado vazio: dizer "você não
   * salvou nada" a quem teve a rede falhar é uma mentira.
   */
  it('reports a load failure as an error, never as an empty list', () => {
    state({ isError: true });
    render(<WishlistPageContent />);

    expect(screen.getByRole('alert')).toHaveTextContent('loadError');
    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.queryByText('emptyCta')).not.toBeInTheDocument();
  });

  it('lets the user retry after a failure', () => {
    const refetch = vi.fn();
    state({ isError: true, refetch });
    render(<WishlistPageContent />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    expect(refetch).toHaveBeenCalled();
  });
});
