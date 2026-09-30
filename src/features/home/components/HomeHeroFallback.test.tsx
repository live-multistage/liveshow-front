import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HomeRail, HomeRailItem, HomeRailsResponse } from '@live-show/api-contracts';
import type { EventResponse } from '@/features/events';

const query = vi.fn();

vi.mock('../queries/get-home-rails', () => ({ useHomeRailsQuery: () => query() }));
vi.mock('@/features/events/components/public/editorial/EditorialHero', () => ({
  EditorialHero: ({ slides }: { slides: Array<{ title: string }> }) => (
    <div data-testid="hero">{slides.map((s) => s.title).join(',')}</div>
  ),
}));

import { HomeHeroFallback } from './HomeHeroFallback';

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: 'evt-1', slug: 'evt-1', title: 'Event 1', description: 'desc', category: 'MUSIC',
    organizationId: 'org-1', organization: null,
    startsAt: '2026-09-25T20:00:00.000Z', endsAt: '2026-09-25T22:00:00.000Z',
    status: 'PUBLISHED', bannerUrl: null, thumbnailUrl: null, teaserVideoUrl: null,
    finishedAt: null, venue: null, city: null, country: null, venueData: null,
    visibility: 'PUBLIC', format: 'LIVE', latencyMode: 'STANDARD', domain: null,
    subtype: null, camerasCount: 1, isFree: true, publiclyFunded: false,
    ...overrides,
  };
}

function page(items: HomeRailItem[]): HomeRailsResponse {
  const rail: HomeRail = {
    key: 'curated:live', dimension: 'curated', kind: 'events',
    title: 'Ao vivo', items, seeAllHref: '/events',
  };
  return { rails: [rail], nextCursor: null, snapshotAt: '2026-09-25T00:00:00.000Z' };
}

describe('HomeHeroFallback', () => {
  it('shows a hero-sized placeholder while the feed is in flight', () => {
    query.mockReturnValue({ data: undefined, isFetching: true });
    render(<HomeHeroFallback />);

    expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
  });

  it('replaces the placeholder with the real hero once the feed answers', () => {
    query.mockReturnValue({
      data: { pages: [page([makeEvent({ title: 'Live Show' })])] },
      isFetching: false,
    });
    render(<HomeHeroFallback />);

    expect(screen.getByTestId('hero')).toHaveTextContent('Live Show');
    expect(screen.queryByTestId('hero-skeleton')).not.toBeInTheDocument();
  });

  it('renders nothing when the feed settles with no events', () => {
    query.mockReturnValue({ data: { pages: [page([])] }, isFetching: false });
    const { container } = render(<HomeHeroFallback />);

    expect(container).toBeEmptyDOMElement();
  });
});
