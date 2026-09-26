import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { HomeRail } from '@live-show/api-contracts';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('./HomeRail', () => ({
  HomeRailSection: ({ rail }: { rail: HomeRail }) => <div data-testid="rail">{rail.key}</div>,
}));
vi.mock('@/features/advertisements/components/AdBanner', () => ({
  AdBanner: () => <div data-testid="ad-banner" />,
}));
vi.mock('../queries/get-home-rails', () => ({ useHomeRailsQuery: vi.fn() }));

import { useHomeRailsQuery } from '../queries/get-home-rails';
import { HomeRails } from './HomeRails';

type Cb = (entries: Array<{ isIntersecting: boolean }>) => void;
let callbacks: Cb[] = [];

class FakeObserver {
  constructor(cb: Cb) { callbacks.push(cb); }
  observe() {}
  disconnect() {}
}

function rail(key: string): HomeRail {
  return { key, dimension: 'curated', kind: 'events', title: key, items: [], seeAllHref: '/events' };
}

const fetchNextPage = vi.fn();
const refetch = vi.fn();

function setQuery(over: Record<string, unknown> = {}) {
  vi.mocked(useHomeRailsQuery).mockReturnValue({
    data: { pages: [], pageParams: [] },
    fetchNextPage,
    refetch,
    hasNextPage: true,
    isFetchingNextPage: false,
    isError: false,
    isFetching: false,
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function pages(...keysPerPage: string[][]) {
  return { data: { pages: keysPerPage.map((keys) => ({ rails: keys.map(rail), nextCursor: null })), pageParams: [] } };
}

describe('HomeRails', () => {
  beforeEach(() => {
    callbacks = [];
    fetchNextPage.mockClear();
    refetch.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  it('renders one rail section per rail across pages, with a single ad after the 3rd', () => {
    setQuery(pages(['a', 'b', 'c'], ['d', 'e']));

    const { container } = render(<HomeRails />);

    expect(screen.getAllByTestId('rail').map((el) => el.textContent)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(screen.getAllByTestId('ad-banner')).toHaveLength(1);
    // The ad sits between the 3rd and the 4th rail, not anywhere else.
    const order = [...container.querySelectorAll('[data-testid="rail"], [data-testid="ad-banner"]')].map(
      (el) => el.getAttribute('data-testid') === 'ad-banner' ? 'ad' : el.textContent,
    );
    expect(order).toEqual(['a', 'b', 'c', 'ad', 'd', 'e']);
  });

  it('renders 2 skeleton rails while fetching the next page', () => {
    setQuery({ ...pages(['a']), isFetchingNextPage: true });

    render(<HomeRails />);

    expect(screen.getAllByTestId('rail-skeleton')).toHaveLength(2);
  });

  it('shows the error row and retries the next page when rails are already loaded', () => {
    setQuery({ ...pages(['a']), isError: true });

    render(<HomeRails />);

    expect(screen.getByRole('alert')).toHaveTextContent('loadError');
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it('retries the whole query when the first page failed with no rails', () => {
    setQuery({ isError: true, hasNextPage: false });

    render(<HomeRails />);

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('shows the end marker with a link to the full listing when there is no next page', () => {
    setQuery({ ...pages(['a']), hasNextPage: false });

    render(<HomeRails />);

    expect(screen.getByText('end')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'seeAllEvents' })).toHaveAttribute('href', '/events');
  });

  it('does not show the end marker while there are more pages', () => {
    setQuery(pages(['a']));

    render(<HomeRails />);

    expect(screen.queryByText('end')).not.toBeInTheDocument();
  });

  it('fetches the next page when the sentinel intersects', () => {
    setQuery(pages(['a']));

    render(<HomeRails />);

    expect(fetchNextPage).not.toHaveBeenCalled();
    callbacks[0]([{ isIntersecting: true }]);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not fetch while a page is already in flight', () => {
    setQuery({ ...pages(['a']), isFetchingNextPage: true });

    render(<HomeRails />);
    callbacks[0]([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not observe when there is no next page', () => {
    setQuery({ ...pages(['a']), hasNextPage: false });

    render(<HomeRails />);

    expect(callbacks).toHaveLength(0);
  });

  it('renders the empty state when the feed settled with zero rails', () => {
    setQuery({ hasNextPage: false });

    render(<HomeRails />);

    expect(screen.getByText('noShows')).toBeInTheDocument();
    expect(screen.queryByTestId('rail')).not.toBeInTheDocument();
  });

  it('does not render the empty state while the first page is still loading', () => {
    setQuery({ isFetching: true });

    render(<HomeRails />);

    expect(screen.queryByText('noShows')).not.toBeInTheDocument();
  });

  it('does not render the empty state when zero rails settled but a next page is still expected', () => {
    setQuery({ hasNextPage: true });

    render(<HomeRails />);

    expect(screen.queryByText('noShows')).not.toBeInTheDocument();
    // The sentinel is observed only when there is a next page to fetch.
    expect(callbacks).toHaveLength(1);
  });

  it('dedupes rails repeated across pages after a candidates-refresh restart', () => {
    setQuery(pages(['a', 'b'], ['b', 'c']));

    render(<HomeRails />);

    expect(screen.getAllByTestId('rail').map((el) => el.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('shows 2 skeleton rails while the first page itself is still loading', () => {
    setQuery({ isFetching: true });

    render(<HomeRails />);

    expect(screen.getAllByTestId('rail-skeleton')).toHaveLength(2);
  });
});
