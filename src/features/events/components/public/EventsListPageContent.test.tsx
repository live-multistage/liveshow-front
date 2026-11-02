import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventsListPageContent } from './EventsListPageContent';
import type { PaginatedEventsResponse, EventResponse } from '@/features/events';

const push = vi.fn();
const replace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
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

// Radix Select (DS CustomSelect) needs these pointer/scroll APIs jsdom lacks.
beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock('@live-show/analytics-sdk/react', () => ({
  TrackFeature: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The component only pulls useListEventsPageQuery + eventToShow from the
// feature barrel — mock just those, skipping the barrel's much heavier
// dashboard-side exports.
const listEventsPageQueryMock = vi.fn();
const eventCountsQueryMock = vi.fn();
vi.mock('@/features/events', () => ({
  useListEventsPageQuery: (...args: unknown[]) => listEventsPageQueryMock(...args),
  useEventCountsQuery: (...args: unknown[]) => eventCountsQueryMock(...args),
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

const COUNTS = { all: 480, live: 33, replay: 17, today: 55, weekend: 40, free: 99 };

describe('EventsListPageContent pagination', () => {
  beforeEach(() => {
    eventCountsQueryMock.mockReturnValue({ data: COUNTS });
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

describe('EventsListPageContent server-side chips', () => {
  const setup = (qs = '', total = 48) => {
    currentSearchParams = new URLSearchParams(qs);
    const initialPage = makePage({ page: 1, total });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });
    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
  };

  beforeEach(() => {
    push.mockClear();
    listEventsPageQueryMock.mockReset();
    eventCountsQueryMock.mockReturnValue({ data: COUNTS });
  });

  it('renders badge counts from the counts hook, not the page length', () => {
    setup();
    expect(screen.getByRole('button', { name: /TODOS/ })).toHaveTextContent('480');
    expect(screen.getByRole('button', { name: /COM REPRISE/ })).toHaveTextContent('17');
    expect(screen.getByRole('button', { name: /GRATUITOS/ })).toHaveTextContent('99');
  });

  it('shows a dash while counts are loading', () => {
    eventCountsQueryMock.mockReturnValue({ data: undefined });
    setup();
    expect(screen.getByRole('button', { name: /HOJE/ })).toHaveTextContent('—');
  });

  it('pushes filter=live when AO VIVO is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /AO VIVO/ }));
    expect(push).toHaveBeenCalledWith('/events?filter=live', { scroll: false });
  });

  it('drops the page param and keeps category when HOJE is clicked', () => {
    setup('category=MUSIC&page=3', 240);
    fireEvent.click(screen.getByRole('button', { name: /HOJE/ }));
    expect(push).toHaveBeenCalledWith('/events?category=MUSIC&when=today', { scroll: false });
  });

  it('derives the active chip from the URL', () => {
    setup('when=weekend');
    expect(screen.getByRole('button', { name: /FIM DE SEMANA/ }).className).toMatch(/chipActive/);
    expect(screen.getByRole('button', { name: /TODOS/ }).className).not.toMatch(/chipActive/);
  });

  it('shows the server total in the count label', () => {
    setup('', 48);
    expect(screen.getByRole('heading', { name: /EVENTOS ENCONTRADOS/ })).toHaveTextContent('48');
  });
});

describe('EventsListPageContent tracking', () => {
  beforeEach(() => {
    eventCountsQueryMock.mockReturnValue({ data: COUNTS });
    push.mockClear();
    listEventsPageQueryMock.mockReset();
    trackMock.mockClear();
    currentSearchParams = new URLSearchParams();
  });

  it('tracks events_filtered when a chip is clicked, with the server count for that chip', () => {
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    fireEvent.click(screen.getByRole('button', { name: /AO VIVO/ }));

    expect(trackMock).toHaveBeenCalledWith('events_filtered', { filter: 'chip', value: 'live', resultCount: 33 });
  });

  it('tracks events_filtered when the sort select changes', async () => {
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Ordenar' }));
    await userEvent.click(screen.getByRole('option', { name: 'NOME (A → Z)' }));

    expect(trackMock).toHaveBeenCalledWith('events_filtered', { filter: 'sort', value: 'name-asc', resultCount: 2 });
  });

  it('tracks search_performed for the committed term with the server total', () => {
    currentSearchParams = new URLSearchParams({ q: 'rock' });
    const initialPage = makePage({ page: 1, total: 137 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(trackMock).toHaveBeenCalledWith('search_performed', { query: 'rock', resultCount: 137 });
  });

  it('does not track search_performed without a term', () => {
    const initialPage = makePage({ page: 1, total: 2 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage, isError: false, refetch: vi.fn() });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('EventsListPageContent server-side search', () => {
  const renderPage = (qs: string, page: PaginatedEventsResponse) => {
    currentSearchParams = new URLSearchParams(qs);
    listEventsPageQueryMock.mockReturnValue({ data: page, isError: false, refetch: vi.fn() });
    return render(<EventsListPageContent initialPage={page} pageSize={24} />);
  };
  const input = () => screen.getByPlaceholderText('searchPlaceholder') as HTMLInputElement;
  const type = (value: string) => {
    fireEvent.change(input(), { target: { value } });
    act(() => vi.advanceTimersByTime(300));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    eventCountsQueryMock.mockReturnValue({ data: COUNTS });
    push.mockClear();
    replace.mockClear();
    trackMock.mockClear();
    listEventsPageQueryMock.mockReset();
    eventCountsQueryMock.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('commits the settled term to the URL once, resetting the page and keeping filters', () => {
    renderPage('category=MUSIC&page=3', makePage({ page: 3, total: 240 }));

    fireEvent.change(input(), { target: { value: 'ro' } });
    expect(replace).not.toHaveBeenCalled();
    type('  rock  ');

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/events?category=MUSIC&q=rock', { scroll: false });
  });

  it('removes q from the URL when the input is cleared', () => {
    renderPage('q=rock', makePage({ total: 2 }));

    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    act(() => vi.advanceTimersByTime(300));

    expect(replace).toHaveBeenCalledWith('/events', { scroll: false });
  });

  it('seeds the input from the URL and requests listing and counts with q', () => {
    renderPage('q=rock', makePage({ total: 2 }));

    expect(input().value).toBe('rock');
    expect(listEventsPageQueryMock.mock.calls[0][0]).toMatchObject({ q: 'rock' });
    expect(eventCountsQueryMock.mock.calls[0][0]).toMatchObject({ q: 'rock' });
  });

  it('shows the server total and every returned item, without filtering them again', () => {
    renderPage('q=recife', makePage({ total: 137 }));

    expect(screen.getByRole('heading', { name: /137 EVENTOS ENCONTRADOS/ })).toBeInTheDocument();
    expect(screen.getByText('Show 1')).toBeInTheDocument();
    expect(screen.getByText('Show 2')).toBeInTheDocument();
  });

  it('resets the input when the URL term changes from outside (Back)', () => {
    const page = makePage({ total: 2 });
    const { rerender } = renderPage('q=rock', page);

    currentSearchParams = new URLSearchParams();
    rerender(<EventsListPageContent initialPage={page} pageSize={24} />);

    expect(input().value).toBe('');
    act(() => vi.advanceTimersByTime(300));
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps newer keystrokes when an earlier commit lands', () => {
    const page = makePage({ total: 2 });
    const { rerender } = renderPage('', page);

    type('roc');
    fireEvent.change(input(), { target: { value: 'rock' } });
    currentSearchParams = new URLSearchParams({ q: 'roc' });
    rerender(<EventsListPageContent initialPage={page} pageSize={24} />);

    expect(input().value).toBe('rock');
  });

  it('empty state clears the search along with the chip', () => {
    renderPage('q=nada&filter=live&category=MUSIC', makePage({ items: [], total: 0 }));

    fireEvent.click(screen.getByRole('button', { name: 'clearFilters' }));

    expect(push).toHaveBeenCalledWith('/events?category=MUSIC', { scroll: false });
  });
});
