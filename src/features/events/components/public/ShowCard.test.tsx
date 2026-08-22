import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowCard } from './ShowCard';
import type { Show } from '../../types/show';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/features/wishlist/components/WishlistButton', () => ({
  WishlistButton: () => null,
}));

function makeShow(overrides: Partial<Show> = {}): Show {
  return {
    id: 'evt-1',
    title: 'Episódio 3',
    artist: '',
    category: 'Rock',
    venue: 'Arena',
    city: 'São Paulo',
    country: 'Brasil',
    date: '2026-08-20',
    time: '20:00',
    duration: '2h',
    image: 'https://example.com/img.jpg',
    price: 50,
    currency: 'BRL',
    isLive: false,
    hasReplay: false,
    cameras: [],
    description: '',
    tags: [],
    ...overrides,
  };
}

describe('ShowCard', () => {
  it('does not render a series badge when the show has no seriesId', () => {
    render(<ShowCard show={makeShow()} />);

    expect(screen.queryByText('badge')).not.toBeInTheDocument();
  });

  it('renders a series badge when the show belongs to a series', () => {
    render(<ShowCard show={makeShow({ seriesId: 'series-1' })} />);

    expect(screen.getByText('badge')).toBeInTheDocument();
  });

  it('links the series badge to the series page when a seriesSlug is present', () => {
    render(<ShowCard show={makeShow({ seriesId: 'series-1', seriesSlug: 'quinta-do-rock' })} />);

    expect(screen.getByText('badge').closest('a')).toHaveAttribute(
      'href',
      '/series/quinta-do-rock',
    );
  });
});
