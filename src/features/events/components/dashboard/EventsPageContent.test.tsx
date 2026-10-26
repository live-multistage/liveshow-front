import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import type { MyEventCounts, MyEventsPageResponse } from '../../types/event.types';

let searchParams = new URLSearchParams();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push, replace }),
}));

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${ns}.${key} ${JSON.stringify(values)}` : `${ns}.${key}`,
}));

vi.mock('./EventDashboardCard', () => ({
  EventDashboardCard: ({ event }: { event: { title: string } }) => <div data-testid="event-card">{event.title}</div>,
}));

let pageResult: { data?: MyEventsPageResponse; isLoading: boolean; isError: boolean; isPlaceholderData: boolean };
let countsData: MyEventCounts | undefined;
const pageQuery = vi.fn();
vi.mock('../../queries/use-my-events-page', () => ({
  useMyEventsPageQuery: (params: unknown) => {
    pageQuery(params);
    return pageResult;
  },
  useMyEventCountsQuery: () => ({ data: countsData }),
}));

import { EventsPageContent } from './EventsPageContent';

function makePage(total: number, page = 1, count = Math.min(total, 20)): MyEventsPageResponse {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      id: `e${page}-${i}`,
      title: `Evento ${page}-${i}`,
      collaborationRole: 'OWNER',
    })) as MyEventsPageResponse['items'],
    page,
    pageSize: 20,
    total,
  };
}

function setPage(data: MyEventsPageResponse | undefined, extra: Partial<typeof pageResult> = {}) {
  pageResult = { data, isLoading: !data, isError: false, isPlaceholderData: false, ...extra };
}

describe('EventsPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    countsData = { all: 45, live: 2, upcoming: 13, finished: 30 };
    setPage(makePage(45));
  });

  it('requests the page and status from the URL', () => {
    searchParams = new URLSearchParams('status=DRAFT&page=2');
    setPage(makePage(30, 2));
    render(<EventsPageContent />);
    expect(pageQuery).toHaveBeenLastCalledWith({ page: 2, status: 'DRAFT' });
  });

  it('shows the stat cards from the counts endpoint', () => {
    render(<EventsPageContent />);
    const stat = (label: string) => screen.getByText(label).previousElementSibling?.textContent;
    expect(stat('eventsPage.statTotal')).toBe('45');
    expect(stat('eventsPage.statLive')).toBe('2');
    expect(stat('eventsPage.statPublished')).toBe('13');
    expect(stat('eventsPage.statFinished')).toBe('30');
  });

  it('renders the six status tabs without counters', () => {
    render(<EventsPageContent />);
    const tabs = within(screen.getByRole('navigation', { name: 'eventsPage.filtersNav' })).getAllByRole('link');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'eventsPage.filterAll',
      'eventsPage.filterDraft',
      'eventsPage.filterPublished',
      'eventsPage.filterLive',
      'eventsPage.filterFinished',
      'eventsPage.filterCancelled',
    ]);
  });

  it('shows no stale numbers while counts load', () => {
    countsData = undefined;
    render(<EventsPageContent />);
    expect(screen.getByText('eventsPage.statTotal').previousElementSibling?.textContent).toBe('–');
  });

  it('tab links reset to page 1 and keep the chosen status', () => {
    searchParams = new URLSearchParams('page=3');
    setPage(makePage(45, 3, 5));
    render(<EventsPageContent />);
    expect(screen.getByRole('link', { name: 'eventsPage.filterDraft' }).getAttribute('href')).toBe('/dashboard/events?status=DRAFT');
    expect(screen.getByRole('link', { name: 'eventsPage.filterCancelled' }).getAttribute('href')).toBe('/dashboard/events?status=CANCELLED');
    expect(screen.getByRole('link', { name: 'eventsPage.filterAll' }).getAttribute('href')).toBe('/dashboard/events');
    expect(screen.getByRole('link', { name: 'eventsPage.filterAll' }).getAttribute('aria-current')).toBe('page');
  });

  it('paginates within the current tab', () => {
    searchParams = new URLSearchParams('status=PUBLISHED');
    setPage(makePage(45));
    render(<EventsPageContent />);
    expect(screen.getByRole('link', { name: 'eventsPage.filterPublished' }).getAttribute('aria-current')).toBe('page');
    const pager = screen.getByRole('navigation', { name: 'events.list.pagination.nav' });
    expect(within(pager).getByRole('link', { name: '2' }).getAttribute('href')).toBe('/dashboard/events?status=PUBLISHED&page=2');
    fireEvent.click(within(pager).getByRole('link', { name: 'events.list.pagination.nextAria' }));
    expect(push).toHaveBeenCalledWith('/dashboard/events?status=PUBLISHED&page=2');
    expect(screen.getByText(/events.list.pagination.range/).textContent).toContain('"from":1,"to":20,"total":45');
  });

  it('hides pagination when everything fits on one page', () => {
    setPage(makePage(5));
    render(<EventsPageContent />);
    expect(screen.queryByRole('navigation', { name: 'events.list.pagination.nav' })).toBeNull();
    expect(screen.getAllByTestId('event-card')).toHaveLength(5);
  });

  it('clamps a page past the end back to the last page', () => {
    searchParams = new URLSearchParams('status=LIVE&page=9');
    setPage(makePage(25, 9, 0));
    render(<EventsPageContent />);
    expect(replace).toHaveBeenCalledWith('/dashboard/events?status=LIVE&page=2');
  });

  it('does not clamp against placeholder data from the previous tab', () => {
    searchParams = new URLSearchParams('status=LIVE&page=3');
    setPage(makePage(5, 1, 5), { isPlaceholderData: true });
    render(<EventsPageContent />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the create-first empty state when the organizer has no events', () => {
    setPage(makePage(0));
    render(<EventsPageContent />);
    expect(screen.getByText('eventsPage.empty')).toBeTruthy();
    expect(screen.getByRole('link', { name: /eventsPage.createFirst/ })).toBeTruthy();
    expect(screen.queryByText('eventsPage.emptyFilter')).toBeNull();
  });

  it('shows the empty-tab state with a way back to every event', () => {
    searchParams = new URLSearchParams('status=CANCELLED');
    setPage(makePage(0));
    render(<EventsPageContent />);
    expect(screen.getByText('eventsPage.emptyFilter')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'eventsPage.showAll' }).getAttribute('href')).toBe('/dashboard/events');
    expect(screen.queryByRole('link', { name: /eventsPage.createFirst/ })).toBeNull();
  });

  it('shows loading and error states', () => {
    setPage(undefined);
    const { unmount } = render(<EventsPageContent />);
    expect(screen.getByText('eventsPage.loading')).toBeTruthy();
    unmount();
    setPage(undefined, { isLoading: false, isError: true });
    render(<EventsPageContent />);
    expect(screen.getByText('eventsPage.error')).toBeTruthy();
    expect(screen.queryByText('eventsPage.empty')).toBeNull();
  });
});
