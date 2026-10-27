import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import type { MyOrganizationsPageResponse, MyOrganizationsSummary, OrganizationResponse } from '../types/organization.types';

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

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../components/OrganizationCard', () => ({
  OrganizationCard: ({ organization }: { organization: OrganizationResponse }) => (
    <div data-testid="org-card">{organization.name}</div>
  ),
}));

let pageResult: { data?: MyOrganizationsPageResponse; isLoading: boolean; isError: boolean; isPlaceholderData: boolean };
let summaryData: MyOrganizationsSummary | undefined;
const pageQuery = vi.fn();
vi.mock('../hooks/use-my-organizations-page', () => ({
  useMyOrganizationsPageQuery: (params: unknown) => {
    pageQuery(params);
    return pageResult;
  },
  useMyOrganizationsSummaryQuery: () => ({ data: summaryData }),
}));

import { OrganizationListPage } from './OrganizationListPage';

const SUMMARY: MyOrganizationsSummary = {
  counts: { all: 45, owned: 30, invited: 12, archived: 3 },
  totals: {
    activeEventsCount: 7,
    memberCount: 61,
    salesThisMonth: [
      { currency: 'BRL', amount: 1500.5 },
      { currency: 'USD', amount: 999 },
    ],
  },
};

function makePage(total: number, page = 1, count = Math.min(total, 20)): MyOrganizationsPageResponse {
  return {
    items: Array.from({ length: count }, (_, i) => ({
      id: `o${page}-${i}`,
      name: `Org ${page}-${i}`,
      slug: `org-${page}-${i}`,
      ownerId: 'user-1',
      status: 'ACTIVE' as const,
      website: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      role: 'OWNER' as const,
      activeEventsCount: 0,
      memberCount: 1,
      salesThisMonth: [],
    })),
    page,
    pageSize: 20,
    total,
  };
}

function setPage(data: MyOrganizationsPageResponse | undefined, extra: Partial<typeof pageResult> = {}) {
  pageResult = { data, isLoading: !data, isError: false, isPlaceholderData: false, ...extra };
}

function kpi(label: string) {
  const card = screen.getByText(label).closest('[class*="kpiCard"]') as HTMLElement;
  return card.querySelector('[class*="kpiNum"]')?.textContent;
}

function tab(name: RegExp) {
  return within(screen.getByTestId('org-tabs')).getByRole('link', { name });
}

describe('OrganizationListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    summaryData = SUMMARY;
    setPage(makePage(45));
  });

  afterEach(() => vi.useRealTimers());

  it('requests the tab, search and page from the URL', () => {
    searchParams = new URLSearchParams('tab=invited&q=acme&page=2');
    setPage(makePage(30, 2));
    render(<OrganizationListPage />);
    expect(pageQuery).toHaveBeenLastCalledWith({ page: 2, filter: 'invited', q: 'acme' });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('acme');
  });

  it('shows the KPIs from the summary, summing only BRL sales', () => {
    render(<OrganizationListPage />);
    expect(kpi('TOTAL DE ORGS')).toBe('45');
    expect(kpi('EVENTOS ATIVOS')).toBe('7');
    expect(kpi('EQUIPE TOTAL')).toBe('61');
    expect(kpi('VENDAS NO MÊS')).toBe('1.500,50');
  });

  it('shows — in the KPIs and no tab badges while the summary loads', () => {
    summaryData = undefined;
    render(<OrganizationListPage />);
    expect(kpi('TOTAL DE ORGS')).toBe('—');
    expect(kpi('VENDAS NO MÊS')).toBe('—');
    expect(tab(/organizations.tabAll/).textContent).toBe('organizations.tabAll');
  });

  it('renders the four tabs with summary counters that ignore the search', () => {
    searchParams = new URLSearchParams('q=acme');
    setPage(makePage(2));
    render(<OrganizationListPage />);
    const labels = within(screen.getByTestId('org-tabs')).getAllByRole('link').map((l) => l.textContent);
    expect(labels).toEqual([
      'organizations.tabAll45',
      'organizations.tabMine30',
      'organizations.tabInvited12',
      'organizations.tabArchived3',
    ]);
  });

  it('tab links reset to page 1 and keep the search', () => {
    searchParams = new URLSearchParams('q=acme&page=3');
    setPage(makePage(45, 3, 5));
    render(<OrganizationListPage />);
    expect(tab(/organizations.tabArchived/).getAttribute('href')).toBe('/dashboard/organizations?tab=archived&q=acme');
    expect(tab(/organizations.tabMine/).getAttribute('href')).toBe('/dashboard/organizations?tab=owned&q=acme');
    expect(tab(/organizations.tabAll/).getAttribute('href')).toBe('/dashboard/organizations?q=acme');
    expect(tab(/organizations.tabAll/).getAttribute('aria-current')).toBe('page');
  });

  it('debounces the search into q and resets to page 1', () => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams('tab=owned&page=2');
    setPage(makePage(30, 2));
    render(<OrganizationListPage />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ac' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'acme' } });
    act(() => vi.advanceTimersByTime(299));
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/dashboard/organizations?tab=owned&q=acme');
  });

  it('does not navigate on mount when the input matches the URL', () => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams('q=acme&page=2');
    setPage(makePage(30, 2));
    render(<OrganizationListPage />);
    act(() => vi.advanceTimersByTime(1000));
    expect(replace).not.toHaveBeenCalled();
  });

  it('paginates within the current tab and search', () => {
    searchParams = new URLSearchParams('tab=owned&q=acme');
    setPage(makePage(45));
    render(<OrganizationListPage />);
    const pager = screen.getByRole('navigation', { name: 'dashboard.pagination.nav' });
    expect(within(pager).getByRole('link', { name: '2' }).getAttribute('href')).toBe(
      '/dashboard/organizations?tab=owned&q=acme&page=2',
    );
    fireEvent.click(within(pager).getByRole('link', { name: 'dashboard.pagination.nextAria' }));
    expect(push).toHaveBeenCalledWith('/dashboard/organizations?tab=owned&q=acme&page=2');
    expect(screen.getByText(/organizations.pagination.range/).textContent).toContain('"from":1,"to":20,"total":45');
  });

  it('keeps the create card at the end of every page', () => {
    searchParams = new URLSearchParams('page=2');
    setPage(makePage(25, 2, 5));
    render(<OrganizationListPage />);
    const grid = screen.getAllByTestId('org-card')[0].parentElement as HTMLElement;
    expect(grid.lastElementChild?.textContent).toContain('organizations.createCard');
    expect(screen.getAllByTestId('org-card')).toHaveLength(5);
  });

  it('clamps a page past the end to the last page without a bogus range', () => {
    searchParams = new URLSearchParams('tab=archived&page=9');
    setPage(makePage(25, 9, 0));
    render(<OrganizationListPage />);
    expect(replace).toHaveBeenCalledWith('/dashboard/organizations?tab=archived&page=2');
    expect(screen.queryByText(/organizations.pagination.range/)).toBeNull();
  });

  it('does not clamp against placeholder data', () => {
    searchParams = new URLSearchParams('tab=owned&page=3');
    setPage(makePage(5, 1, 5), { isPlaceholderData: true });
    render(<OrganizationListPage />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows the filtered empty state with a clear-search action and the create card', () => {
    searchParams = new URLSearchParams('tab=invited&q=zzz');
    setPage(makePage(0));
    render(<OrganizationListPage />);
    expect(screen.getByText('organizations.empty')).toBeTruthy();
    expect(screen.getByText('organizations.createCard')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'organizations.clearSearch' }));
    expect(replace).toHaveBeenCalledWith('/dashboard/organizations?tab=invited');
  });

  it('shows the filtered empty state without clear-search when only a tab filters', () => {
    searchParams = new URLSearchParams('tab=archived');
    setPage(makePage(0));
    render(<OrganizationListPage />);
    expect(screen.getByText('organizations.empty')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'organizations.clearSearch' })).toBeNull();
  });

  it('shows only the create card when the organizer has no organizations', () => {
    summaryData = { ...SUMMARY, counts: { all: 0, owned: 0, invited: 0, archived: 0 } };
    setPage(makePage(0));
    render(<OrganizationListPage />);
    expect(screen.queryByText('organizations.empty')).toBeNull();
    expect(screen.getByText('organizations.createCard')).toBeTruthy();
  });

  it('shows loading and error states', () => {
    setPage(undefined);
    const { unmount } = render(<OrganizationListPage />);
    expect(screen.getByText('organizations.loading')).toBeTruthy();
    unmount();
    setPage(undefined, { isLoading: false, isError: true });
    render(<OrganizationListPage />);
    expect(screen.getByText('organizations.loadErrorRetry')).toBeTruthy();
    expect(screen.queryByText('organizations.createCard')).toBeNull();
  });
});
