import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventsListPageContent } from './EventsListPageContent';
import type { PaginatedEventsResponse, EventResponse } from '@/features/events';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
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
  });

  it('renders the page seeded by the server as its initial state', () => {
    const initialPage = makePage({ page: 1, total: 48 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith('all', 1, 24, initialPage);
    expect(screen.getByText('Show 1')).toBeInTheDocument();
  });

  it('renders the range label from the current page data', () => {
    const initialPage = makePage({ page: 1, total: 48 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.getByText(/pagination\.range/)).toBeInTheDocument();
  });

  it('pushes ?page=3 and re-queries page 3 when a page number is clicked', () => {
    const initialPage = makePage({ page: 2, total: 240 }); // 10 pages of 24, window includes 1 2 3 … 10
    listEventsPageQueryMock.mockReturnValue({ data: initialPage });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    fireEvent.click(screen.getByText('3'));

    expect(push).toHaveBeenCalledWith('/events?page=3', { scroll: false });
    expect(listEventsPageQueryMock).toHaveBeenLastCalledWith('all', 3, 24, undefined);
  });

  it('renders no pagination controls when the catalog is empty', () => {
    const initialPage = makePage({ items: [], page: 1, total: 0 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders the last page content when the server already clamped an out-of-range request', () => {
    // page.tsx clamps ?page=999 server-side before it ever reaches this
    // component, so initialPage.page here is already the last real page.
    const initialPage = makePage({ page: 10, total: 240 });
    listEventsPageQueryMock.mockReturnValue({ data: initialPage });

    render(<EventsListPageContent initialPage={initialPage} pageSize={24} />);

    expect(listEventsPageQueryMock).toHaveBeenCalledWith('all', 10, 24, initialPage);
    const current = screen.getByText('10');
    expect(current).toHaveAttribute('aria-current', 'page');
  });
});
