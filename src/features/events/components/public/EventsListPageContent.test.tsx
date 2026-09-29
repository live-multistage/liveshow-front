import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventsListPageContent } from './EventsListPageContent';
import type { PaginatedEventsResponse, EventResponse } from '@/features/events';

const push = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('@/features/advertisements', () => ({
  AdBanner: () => null,
}));

vi.mock('./ShowCard', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => <div>{show.title}</div>,
}));

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock('@live-show/analytics-sdk/react', () => ({
  TrackFeature: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The component only pulls useListEventsPageQuery + eventToShow from the
// feature barrel — mock just those, skipping the barrel's much heavier
// dashboard-side exports.
const listEventsPageQueryMock = vi.fn();
vi.mock('@/features/events', () => ({
  useListEventsPageQuery: (...args: unknown[]) => listEventsPageQueryMock(...args),
  eventToShow: (event: EventResponse) => ({
    id: event.id,
    title: event.title,
    city: '',
    venue: '',
    category: '',
    date: '2026-09-25',
    isLive: false,
    hasReplay: false,
    price: 10,
  }),
}));

function makeEvent(id: string): EventResponse {
  return { id, title: `Show ${id}` } as unknown as EventResponse;
}

function makePage(overrides: Partial<PaginatedEventsResponse>): PaginatedEventsResponse {
  return {
    items: [makeEvent('1'), makeEvent('2')],
    page: 1,
    pageSize: 24,
    total: 48,
    ...overrides,
  };
}

describe('EventsListPageContent pagination', () => {
  beforeEach(() => {
    push.mockClear();
    listEventsPageQueryMock.mockReset();
    currentSearchParams = new URLSearchParams();
  });

  it('renders the page seeded by the server as its initial state', () => {
    const initialPage = makePage({ page: 1, total: 48 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith({ filter: 'all', page: 1, pageSize: 24 }, initialPage);
    expect(screen.getByText('Show 1')).toBeInTheDocument();
  });

  it('renders the range label from the current page data', () => {
    const initialPage = makePage({ page: 1, total: 48 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.getByText(/pagination\.range/)).toBeInTheDocument();
  });

  it('reads the page from the URL and requests it', () => {
    currentSearchParams = new URLSearchParams({ page: '3' });
    const initialPage = makePage({ page: 1, total: 240 }); // 10 pages of 24
    const page3 = makePage({ page: 3, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: page3, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith({ filter: 'all', page: 3, pageSize: 24 }, undefined);
    const current = screen.getByText('3');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('re-renders the page requested when the URL search params change, without a click', () => {
    currentSearchParams = new URLSearchParams({ page: '1' });
    const initialPage = makePage({ page: 1, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    const { rerender } = render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    currentSearchParams = new URLSearchParams({ page: '5' });
    const page5 = makePage({ page: 5, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: page5, isError: false, refetch: vi.fn() });
    rerender(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenLastCalledWith({ filter: 'all', page: 5, pageSize: 24 }, undefined);
    const current = screen.getByText('5');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('pushes ?page=3 (does not update local state directly) when a page number is clicked', () => {
    currentSearchParams = new URLSearchParams({ page: '2' });
    const initialPage = makePage({ page: 2, total: 240 }); // window includes 1 2 3 … 10
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    fireEvent.click(screen.getByText('3'));

    expect(push).toHaveBeenCalledWith('/events?page=3', { scroll: false });
  });

  it('renders no pagination controls when the catalog is empty', () => {
    const initialPage = makePage({ items: [], page: 1, total: 0 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders the last page content when a URL page beyond the clamped total is requested', () => {
    currentSearchParams = new URLSearchParams({ page: '999' });
    const initialPage = makePage({ page: 1, total: 240 }); // clamps to page 10
    const lastPage = makePage({ page: 10, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: lastPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith({ filter: 'all', page: 10, pageSize: 24 }, undefined);
    const current = screen.getByText('10');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('renders an error state with a retry button that calls refetch', () => {
    const initialPage = makePage({ page: 1, total: 48 });
    const refetch = vi.fn();
    listEventsPageQueryMock.mockReturnValue({ data: undefined, isError: true, refetch });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.getByText('error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('reads category and page from the URL and requests both together', () => {
    currentSearchParams = new URLSearchParams({ category: 'MUSIC', page: '2' });
    const initialPage = makePage({ page: 1, total: 240 });
    const filteredPage = makePage({ page: 2, total: 10 });
    listEventsPageQueryMock.mockReturnValue({ data: filteredPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith(
      { filter: 'all', category: 'MUSIC', page: 2, pageSize: 24 },
      undefined,
    );
  });

  it('starts on the live chip when the URL has filter=live', () => {
    currentSearchParams = new URLSearchParams({ filter: 'live' });
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    const liveChip = screen.getByRole('button', { name: /AO VIVO/ });
    expect(liveChip.className).toMatch(/chipActive/);
  });

  it('shows an active-filter pill with a clear link when category is set', () => {
    currentSearchParams = new URLSearchParams({ category: 'MUSIC' });
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.getByText('Música')).toBeInTheDocument();
    const clearLink = screen.getByRole('link', { name: /clear/i });
    expect(clearLink).toHaveAttribute('href', '/events');
  });

  it('does not show an active-filter pill when only page/filter are set', () => {
    currentSearchParams = new URLSearchParams({ page: '2' });
    const initialPage = makePage({ page: 2, total: 48 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.queryByRole('link', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('preserves other URL params when paginating', () => {
    currentSearchParams = new URLSearchParams({ category: 'MUSIC', page: '2' });
    const initialPage = makePage({ page: 1, total: 240 });
    const filteredPage = makePage({ page: 2, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: filteredPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    fireEvent.click(screen.getByText('3'));

    expect(push).toHaveBeenCalledWith('/events?category=MUSIC&page=3', { scroll: false });
  });
});

describe('EventsListPageContent tracking', () => {
  beforeEach(() => {
    push.mockClear();
    listEventsPageQueryMock.mockReset();
    trackMock.mockClear();
    currentSearchParams = new URLSearchParams();
  });

  it('tracks events_filtered when a chip is clicked, with the pre-computed count for that filter', () => {
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.click(screen.getByText('AO VIVO'));

    // eventToShow's stub always returns isLive: false, so the live chip's count is 0.
    expect(trackMock).toHaveBeenCalledWith('events_filtered', { filter: 'chip', value: 'live', resultCount: 0 });
  });

  it('tracks events_filtered when the sort select changes', () => {
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'name-asc' } });

    expect(trackMock).toHaveBeenCalledWith('events_filtered', { filter: 'sort', value: 'name-asc', resultCount: 2 });
  });

  it('tracks search_performed once typing settles, with the trimmed query and result count', () => {
    vi.useFakeTimers();
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: 'Show 1' } });

    expect(trackMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);

    expect(trackMock).toHaveBeenCalledWith('search_performed', { query: 'Show 1', resultCount: 1 });
    vi.useRealTimers();
  });

  it('trims surrounding whitespace off the tracked query', () => {
    vi.useFakeTimers();
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: '  Show 1  ' } });
    vi.advanceTimersByTime(400);

    expect(trackMock).toHaveBeenCalledWith('search_performed', expect.objectContaining({ query: 'Show 1' }));
    vi.useRealTimers();
  });

  it('reads resultCount at fire time, not from the closure captured when search last changed', () => {
    vi.useFakeTimers();
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    const { rerender } = render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: 'Show' } });

    // Data changes (e.g. a background refetch) before the debounce fires,
    // growing the match count — `search` itself never changes again.
    const grownPage = makePage({ page: 1, total: 3, items: [makeEvent('1'), makeEvent('2'), makeEvent('3')] });
    listEventsPageQueryMock.mockReturnValue({ data: grownPage, isError: false, refetch: vi.fn() });
    rerender(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    vi.advanceTimersByTime(400);

    expect(trackMock).toHaveBeenCalledWith('search_performed', { query: 'Show', resultCount: 3 });
    vi.useRealTimers();
  });

  it('does not track search_performed for an empty query', () => {
    vi.useFakeTimers();
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: '   ' } });
    vi.advanceTimersByTime(400);

    expect(trackMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
