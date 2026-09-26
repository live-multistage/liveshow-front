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
});
