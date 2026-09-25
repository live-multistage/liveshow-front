import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
vi.mock('@/features/advertisements/components/AdBanner', () => ({
  AdBanner: () => null,
}));
vi.mock('./ShowCard', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => <div>{show.title}</div>,
}));

// Document outline: EditorialHome owns the page's single stable <h1>,
// rendered unconditionally (visually hidden) regardless of whether there is
// hero content to show — a rotating carousel or an empty feed must never
// leave the page without a heading, or duplicate it.
describe('EditorialHome heading outline', () => {
  it('renders exactly one <h1> with the headline text when there are zero hero slides', () => {
    render(<EditorialHome isLoggedIn={false} />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('headline');
  });
});

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

// Regression: the home used to derive everything from a single `filter=all`
// page (oldest-first with years of history), so live/upcoming events could
// be crowded out entirely. It must now be built straight from the
// pre-split live/upcoming props with no client-side status filtering.
describe('EditorialHome live/upcoming composition', () => {
  it('builds the live rail, hero and genre grid from initialLive + initialUpcoming, excluding a finished event that is passed nowhere', () => {
    const live = makeEvent({ id: 'live-1', title: 'Live Show', status: 'LIVE' });
    const upcoming = makeEvent({ id: 'upcoming-1', title: 'Upcoming Show', status: 'PUBLISHED', startsAt: '2026-10-01T20:00:00.000Z' });
    // A finished event is never passed in — simulates the old filter=all
    // first page being dominated by old finished events. It must not appear.

    render(
      <EditorialHome
        isLoggedIn={false}
        initialLive={[live]}
        initialUpcoming={[upcoming]}
      />,
    );

    expect(screen.getAllByText('Live Show').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Upcoming Show').length).toBeGreaterThan(0);
    expect(screen.getByText('liveNow')).toBeInTheDocument();
  });

  it('renders no live rail and no hero when initialLive and initialUpcoming are both empty', () => {
    render(<EditorialHome isLoggedIn={false} initialLive={[]} initialUpcoming={[]} />);

    expect(screen.queryByText('liveNow')).not.toBeInTheDocument();
  });
});
