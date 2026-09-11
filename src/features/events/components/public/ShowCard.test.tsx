import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowCard } from './ShowCard';
import type { Show } from '../../types/show';
import styles from './ShowCard.module.scss';

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
  it('renders the show title', () => {
    render(<ShowCard show={makeShow()} />);

    expect(screen.getByText('Episódio 3')).toBeInTheDocument();
  });
});

describe('ShowCard compact', () => {
  // Under vitest CSS modules yield class names but no real CSS, so the compact
  // treatment (3/4 image, hidden tag chips, full-width CTA) can only be
  // asserted through the class the component applies — read from the module
  // so the test is independent of the class-name strategy.
  it('applies the compact class only when size="compact"', () => {
    const { container: base, unmount } = render(<ShowCard show={makeShow()} />);
    expect(base.firstChild).not.toHaveClass(styles.cardCompact);
    expect(screen.getByText('SHOW')).toBeInTheDocument();
    unmount();

    const { container } = render(<ShowCard show={makeShow()} size="compact" />);
    expect(container.firstChild).toHaveClass(styles.cardCompact);
    expect(screen.getByText('Episódio 3')).toBeInTheDocument();
  });
});
