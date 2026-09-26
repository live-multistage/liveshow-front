import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeRailSection } from './HomeRail';
import type { HomeRail, HomeRailItem } from '@live-show/api-contracts';
import type { ChannelListItem } from '@/features/channels';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('../../events/components/public/ShowCard', () => ({
  ShowCard: ({ show, progress }: { show: { id: string; title: string }; progress?: unknown }) => (
    <div data-testid="show-card" data-progress={progress ? JSON.stringify(progress) : ''}>{show.title}</div>
  ),
}));
vi.mock('@/features/channels/components/ChannelCard', () => ({
  ChannelCard: ({ channel }: { channel: { id: string; name: string } }) => (
    <div data-testid="channel-card">{channel.name}</div>
  ),
}));

function makeItem(overrides: Partial<HomeRailItem>): HomeRailItem {
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
  } as HomeRailItem;
}

function makeRail(overrides: Partial<HomeRail>): HomeRail {
  return {
    key: 'category:music',
    dimension: 'category',
    kind: 'events',
    title: 'Music shows',
    items: [makeItem({ id: 'evt-1' }), makeItem({ id: 'evt-2' })],
    seeAllHref: '/events?category=MUSIC',
    ...overrides,
  };
}

function makeChannel(overrides: Partial<ChannelListItem>): ChannelListItem {
  return {
    id: 'chan-1',
    slug: 'chan-1',
    name: 'Channel 1',
    accessMode: 'FREE',
    isOnAir: false,
    coverUrl: null,
    timezone: 'America/Sao_Paulo',
    current: null,
    next: null,
    ...overrides,
  } as ChannelListItem;
}

describe('HomeRailSection', () => {
  it('renders h2 with rail.title and a slugified id', () => {
    render(<HomeRailSection rail={makeRail({ key: 'category:music', title: 'Music shows' })} />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Music shows' });
    expect(heading.id).toBe('rail-category-music');
  });

  it('renders subtitle when present', () => {
    render(<HomeRailSection rail={makeRail({ subtitle: 'Curated for you' })} />);
    expect(screen.getByText('Curated for you')).toBeInTheDocument();
  });

  it('does not render a subtitle element when absent', () => {
    const { container } = render(<HomeRailSection rail={makeRail({ subtitle: undefined })} />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders one ShowCard per item for an events rail', () => {
    render(<HomeRailSection rail={makeRail({ items: [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })] })} />);
    expect(screen.getAllByTestId('show-card')).toHaveLength(3);
  });

  it('renders one ChannelCard per channel and zero ShowCards for a channels rail', () => {
    render(
      <HomeRailSection
        rail={makeRail({
          kind: 'channels',
          items: [],
          channels: [makeChannel({ id: 'c1' }), makeChannel({ id: 'c2' })],
        })}
      />,
    );
    expect(screen.getAllByTestId('channel-card')).toHaveLength(2);
    expect(screen.queryAllByTestId('show-card')).toHaveLength(0);
  });

  it('passes progress through to ShowCard for personal:continue items', () => {
    const progress = { positionSeconds: 30, durationSeconds: 120 };
    render(
      <HomeRailSection
        rail={makeRail({
          key: 'personal:continue',
          dimension: 'personal',
          items: [makeItem({ id: 'evt-1', progress })],
        })}
      />,
    );
    const card = screen.getByTestId('show-card');
    expect(card.dataset.progress).toBe(JSON.stringify(progress));
  });

  it('renders the pulsing live dot only for the curated:live rail', () => {
    render(<HomeRailSection rail={makeRail({ key: 'curated:live', dimension: 'curated' })} />);
    expect(screen.getByTestId('rail-live-dot')).toBeInTheDocument();
  });

  it('does not render the live dot for a non-live rail', () => {
    render(<HomeRailSection rail={makeRail({ key: 'category:music' })} />);
    expect(screen.queryByTestId('rail-live-dot')).not.toBeInTheDocument();
  });

  it('renders the see-all link with rail.seeAllHref', () => {
    render(<HomeRailSection rail={makeRail({ seeAllHref: '/events?category=MUSIC' })} />);
    expect(screen.getByText('seeAll').closest('a')).toHaveAttribute('href', '/events?category=MUSIC');
  });
});
