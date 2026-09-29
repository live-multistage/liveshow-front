vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({
    relativeTime: () => 'há 4 min',
    dateTime: () => '28/09 21:14:08',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking/users/usr_8f2c41' }));
vi.mock('../../queries/get-user', () => ({
  useTrackingUserQuery: vi.fn(),
  useTrackingUserEventsInfiniteQuery: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { isAxiosError } from 'axios';
import { TrackingUserProfilePage } from './TrackingUserProfilePage';
import { useTrackingUserQuery, useTrackingUserEventsInfiniteQuery } from '../../queries/get-user';
import type { TrackingMessage, TrackingUserProfile, Violation } from '@live-show/api-contracts';

const mockedProfile = vi.mocked(useTrackingUserQuery);
const mockedEvents = vi.mocked(useTrackingUserEventsInfiniteQuery);

const profile: TrackingUserProfile = {
  userId: 'usr_8f2c41',
  traits: { name: 'Ana Souza', age: 28, subscribed: true, address: { city: 'SP' } },
  groupIds: ['org_1'],
  anonymousIds: ['anon_a1', 'anon_b2'],
  analyticsConsent: true,
};

function trackEvent(overrides: Partial<TrackingMessage & { ts: string; violations: Violation[] | null }> = {}) {
  return {
    type: 'track', event: 'order_paid', messageId: 'm1', anonymousId: 'anon_a1', userId: 'usr_8f2c41',
    timestamp: '2026-09-28T21:14:08.101Z', ts: '2026-09-28T21:14:08.101Z', violations: null,
    context: { library: { name: 'showon-web', version: '1.0' }, sessionId: 's1' },
    properties: { amount: 100 },
    ...overrides,
  } as TrackingMessage & { ts: string; violations: Violation[] | null };
}

function mockEventsPage(items: ReturnType<typeof trackEvent>[], nextCursor: string | null = null, overrides: Record<string, unknown> = {}) {
  mockedEvents.mockReturnValue({
    data: { pages: [{ items, nextCursor }] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEventsPage([]);
});

describe('TrackingUserProfilePage', () => {
  it('renders traits by type and expands object traits to JSON', () => {
    mockedProfile.mockReturnValue({ data: profile, isLoading: false, isError: false } as never);
    render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.queryByText(/"city": "SP"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('{…}'));
    expect(screen.getByText(/"city": "SP"/)).toBeInTheDocument();
  });

  it.each([
    [true, 'user.consentValues.granted'],
    [false, 'user.consentValues.denied'],
    [null, 'user.consentValues.unknown'],
  ])('shows the consent pill text for analyticsConsent=%s', (consent, expected) => {
    mockedProfile.mockReturnValue({ data: { ...profile, analyticsConsent: consent }, isLoading: false, isError: false } as never);
    render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('expands a timeline row JSON on click', () => {
    mockedProfile.mockReturnValue({ data: profile, isLoading: false, isError: false } as never);
    mockEventsPage([trackEvent()]);
    render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    expect(screen.queryByText(/"event": "order_paid"/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('order_paid'));
    expect(screen.getByText(/"event": "order_paid"/)).toBeInTheDocument();
  });

  it.each([
    [1, 'user.badges.violation'],
    [3, `user.badges.violations:${JSON.stringify({ count: 3 })}`],
  ])('shows the violation badge text for %i violation(s)', (count, expected) => {
    mockedProfile.mockReturnValue({ data: profile, isLoading: false, isError: false } as never);
    const violations: Violation[] = Array.from({ length: count }, () => ({ kind: 'unplanned_event' }));
    mockEventsPage([trackEvent({ violations })]);
    render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('fetches the next page when "Carregar mais" is clicked and hides it when nextCursor is null', () => {
    mockedProfile.mockReturnValue({ data: profile, isLoading: false, isError: false } as never);
    const fetchNextPage = vi.fn();
    mockEventsPage([trackEvent()], 'cursor-2', { fetchNextPage });
    const { rerender } = render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    fireEvent.click(screen.getByText('user.timeline.loadMore'));
    expect(fetchNextPage).toHaveBeenCalled();

    mockEventsPage([trackEvent()], null);
    rerender(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);
    expect(screen.queryByText('user.timeline.loadMore')).not.toBeInTheDocument();
  });

  it('shows the 404 state when the profile request fails with a 404', () => {
    mockedProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { isAxiosError: true, response: { status: 404 } },
    } as never);
    render(<TrackingUserProfilePage userId="usr_missing" trackingEnabled />);

    expect(isAxiosError({ isAxiosError: true, response: { status: 404 } })).toBe(true);
    expect(screen.getByText('user.notFound')).toBeInTheDocument();
  });

  it('links "Ver como anônimo" to the debugger filtered by that anonymousId', () => {
    mockedProfile.mockReturnValue({ data: profile, isLoading: false, isError: false } as never);
    render(<TrackingUserProfilePage userId="usr_8f2c41" trackingEnabled />);

    const links = screen.getAllByText('user.viewAsAnonymous');
    expect(links[0]).toHaveAttribute('href', '/dashboard/platform/tracking/debugger?anonymousId=anon_a1');
  });
});
