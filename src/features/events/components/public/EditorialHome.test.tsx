import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HomeRail, HomeRailItem, HomeRailsResponse } from '@live-show/api-contracts';
import { EditorialHome } from './EditorialHome';
import type { EventResponse } from '@/features/events';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('./editorial/EditorialHero', () => ({
  EditorialHero: ({ slides }: { slides: Array<{ id: string; title: string }> }) => (
    <div data-testid="hero">{slides.map((s) => s.title).join(',')}</div>
  ),
}));
vi.mock('@/features/home/components/HomeHeroFallback', () => ({
  HomeHeroFallback: () => <div data-testid="hero-fallback" />,
}));
vi.mock('@/features/home/components/HomeRails', () => ({
  HomeRails: ({ initialPage }: { initialPage?: HomeRailsResponse }) => (
    <div data-testid="home-rails">{(initialPage?.rails ?? []).map((r) => r.key).join(',')}</div>
  ),
}));

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: 'evt-1',
    slug: 'evt-1',
    title: 'Event 1',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-09-25T20:00:00.000Z',
    endsAt: '2026-09-25T22:00:00.000Z',
    status: 'PUBLISHED',
    bannerUrl: null,
    thumbnailUrl: null,
    teaserVideoUrl: null,
    finishedAt: null,
    venue: null,
    city: null,
    country: null,
    venueData: null,
    visibility: 'PUBLIC',
    format: 'LIVE',
    latencyMode: 'STANDARD',
    domain: null,
    subtype: null,
    camerasCount: 1,
    isFree: true,
    publiclyFunded: false,
    ...overrides,
  };
}

function rail(key: string, items: HomeRailItem[]): HomeRail {
  return { key, dimension: 'curated', kind: 'events', title: key, items, seeAllHref: '/events' };
}

function response(rails: HomeRail[]): HomeRailsResponse {
  return { rails, nextCursor: null, snapshotAt: '2026-09-25T00:00:00.000Z' };
}

// Document outline: EditorialHome owns the page's single stable <h1>,
// rendered unconditionally (visually hidden) regardless of whether there is
// hero content to show — a rotating carousel or an empty feed must never
// leave the page without a heading, or duplicate it.
describe('EditorialHome heading outline', () => {
  it('renders exactly one <h1> with the headline text when there are zero hero slides', () => {
    render(<EditorialHome initialPage={null} />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('headline');
  });
});

describe('EditorialHome rails feed', () => {
  it('builds the hero from the first eligible rail and seeds HomeRails with the SSR page', () => {
    const page = response([
      rail('category:MUSIC', [makeEvent({ id: 'cat-1', title: 'Category Show' })]),
      rail('curated:live', [makeEvent({ id: 'live-1', title: 'Live Show' })]),
    ]);

    render(<EditorialHome initialPage={page} />);

    expect(screen.getByTestId('hero')).toHaveTextContent('Live Show');
    expect(screen.getByTestId('home-rails')).toHaveTextContent('category:MUSIC,curated:live');
  });

  // A catalogue with nothing live or upcoming still gets a hero — the page
  // used to open on a bare carousel with the navbar floating over nothing.
  it('headlines whatever rail there is when none is a preferred one', () => {
    const page = response([rail('city:sao-paulo', [makeEvent({ id: 'c-1', title: 'City Show' })])]);

    render(<EditorialHome initialPage={page} />);

    expect(screen.getByTestId('hero')).toHaveTextContent('City Show');
    expect(screen.getByTestId('home-rails')).toBeInTheDocument();
  });

  it('renders no hero when there is no show at all', () => {
    render(<EditorialHome initialPage={response([rail('catalog:all', [])])} />);

    expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
  });

  // The server could not pick a hero, but the client feed still can — and
  // until it answers the page must not open on a bare rail list.
  it('hands the hero to the client fallback when the SSR fetch failed', () => {
    render(<EditorialHome initialPage={null} />);

    expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
    expect(screen.getByTestId('hero-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('home-rails')).toHaveTextContent('');
  });
});
