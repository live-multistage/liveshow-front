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
    expect(screen.getByText('showTag')).toBeInTheDocument();
    unmount();

    const { container } = render(<ShowCard show={makeShow()} size="compact" />);
    expect(container.firstChild).toHaveClass(styles.cardCompact);
    expect(screen.getByText('Episódio 3')).toBeInTheDocument();
  });
});

describe('ShowCard category label', () => {
  it('shows the category label for a real category', () => {
    render(<ShowCard show={makeShow({ category: 'Rock', categoryKey: 'MUSIC' })} />);

    expect(screen.getByText('Rock')).toBeInTheDocument();
  });

  it('hides the category label when the category is OTHER', () => {
    render(<ShowCard show={makeShow({ category: 'Outro', categoryKey: 'OTHER' })} />);

    expect(screen.queryByText('Outro')).not.toBeInTheDocument();
  });
});

describe('ShowCard labels', () => {
  it('renders the live badge text from i18n', () => {
    render(<ShowCard show={makeShow({ isLive: true })} />);

    expect(screen.getByText('live')).toBeInTheDocument();
  });

  it('renders the replay badge text from i18n', () => {
    render(<ShowCard show={makeShow({ hasReplay: true })} />);

    expect(screen.getAllByText('replay').length).toBeGreaterThan(0);
  });

  it('renders the overlay replay badge with the uppercase-styled class', () => {
    const { container } = render(<ShowCard show={makeShow({ hasReplay: true })} />);

    const badge = container.querySelector(`.${styles.replayBadge}`);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('replay');
  });
});

describe('ShowCard watch progress', () => {
  it('renders a progressbar and remaining label when progress is given', () => {
    render(
      <ShowCard
        show={makeShow()}
        size="compact"
        progress={{ positionSeconds: 600, durationSeconds: 3600 }}
      />
    );

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '17');
    expect(screen.getByText('remaining')).toBeInTheDocument();
  });

  it('renders no progressbar when progress is omitted', () => {
    render(<ShowCard show={makeShow()} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders no progressbar when durationSeconds is 0', () => {
    render(
      <ShowCard show={makeShow()} progress={{ positionSeconds: 0, durationSeconds: 0 }} />
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // The genre label and the .remaining chip share the bottom-left corner of
  // the cover — with progress, the rail already names the category, so the
  // label yields to the progress chip instead of stacking on top of it.
  it('hides the genre label when progress is given', () => {
    render(
      <ShowCard
        show={makeShow({ category: 'Rock', categoryKey: 'MUSIC' })}
        progress={{ positionSeconds: 600, durationSeconds: 3600 }}
      />
    );

    expect(screen.queryByText('Rock')).not.toBeInTheDocument();
  });

  it('renders the genre label when progress is omitted', () => {
    render(<ShowCard show={makeShow({ category: 'Rock', categoryKey: 'MUSIC' })} />);

    expect(screen.getByText('Rock')).toBeInTheDocument();
  });
});

describe('ShowCard location meta', () => {
  it('joins venue and city with a middle dot', () => {
    render(<ShowCard show={makeShow({ venue: 'Arena', city: 'São Paulo' })} />);

    expect(screen.getByText('Arena · São Paulo')).toBeInTheDocument();
  });

  it('omits the location item when venue and city are both empty', () => {
    const { container } = render(<ShowCard show={makeShow({ venue: '', city: '' })} />);

    expect(container.querySelectorAll(`.${styles.metaItem}`)).toHaveLength(1);
  });
});
