import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Show } from '@/features/events/types/show';
import { GenreGrid } from './GenreGrid';

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

describe('GenreGrid', () => {
  it('renders the header before the chip row in the DOM', () => {
    const { container } = render(
      <GenreGrid shows={[makeShow({ id: '1', category: 'Rock' }), makeShow({ id: '2', category: 'Jazz' })]} />,
    );

    const heading = screen.getByRole('heading', { level: 2 });
    const filterLabel = screen.getByText('filterByCategory');
    // compareDocumentPosition: heading precedes the filter label.
    expect(heading.compareDocumentPosition(filterLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the filter row when there is only one real category', () => {
    render(<GenreGrid shows={[makeShow({ id: '1', category: 'Rock' }), makeShow({ id: '2', category: 'Rock' })]} />);

    expect(screen.queryByText('filterByCategory')).not.toBeInTheDocument();
  });

  it('shows the filter row when there are two or more real categories', () => {
    render(
      <GenreGrid shows={[makeShow({ id: '1', category: 'Rock' }), makeShow({ id: '2', category: 'Jazz' })]} />,
    );

    expect(screen.getByText('filterByCategory')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jazz' })).toBeInTheDocument();
  });

  it('does not count OTHER as a real category', () => {
    render(
      <GenreGrid
        shows={[
          makeShow({ id: '1', category: 'Rock', categoryKey: 'MUSIC' }),
          makeShow({ id: '2', category: 'Outro', categoryKey: 'OTHER' }),
        ]}
      />,
    );

    expect(screen.queryByText('filterByCategory')).not.toBeInTheDocument();
  });

  it('shows the "all" empty state when there are no shows at all', () => {
    render(<GenreGrid shows={[]} />);

    expect(screen.getByText('noShows')).toBeInTheDocument();
  });

  it('shows the category empty state when the selected category no longer has shows', () => {
    const { rerender } = render(
      <GenreGrid shows={[makeShow({ id: '1', category: 'Rock' }), makeShow({ id: '2', category: 'Jazz' })]} />,
    );

    screen.getByRole('button', { name: 'Rock' }).click();
    rerender(<GenreGrid shows={[makeShow({ id: '2', category: 'Jazz' })]} />);

    expect(screen.getByText('noShowsInCategory')).toBeInTheDocument();
  });
});
