vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({ relativeTime, dateTime: (d: Date) => d.toISOString() }),
}));
vi.mock('next/link', () => ({ default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) => <a href={href} onClick={onClick}>{children}</a> }));
const push = vi.fn();
const relativeTime = vi.fn(() => 'agora');
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../queries/blueprints.queries', () => ({ useBlueprintsQuery: vi.fn() }));
vi.mock('./NewBlueprintDialog', () => ({
  NewBlueprintDialog: ({ open, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) =>
    open ? <div><button onClick={() => onCreated('new-id')}>confirm-create</button></div> : null,
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlueprintsPage } from './BlueprintsPage';
import { useBlueprintsQuery } from '../queries/blueprints.queries';
import tableStyles from '../../components/PlatformTable.module.scss';

const refetch = vi.fn();
const rows = [
  { id: 'b1', name: 'Lembrete — comprou', description: 'Push + e-mail', status: 'ACTIVE' as const, activeVersionId: 'v1', latestVersion: 2, counts7d: { started: 12, completed: 9, cancelled: 1, failed: 0 }, updatedAt: new Date().toISOString() },
];

function mockList(data: unknown, overrides: Record<string, unknown> = {}) {
  vi.mocked(useBlueprintsQuery).mockReturnValue({ data, isLoading: false, isError: false, refetch, ...overrides } as never);
}

beforeEach(() => vi.clearAllMocks());

describe('BlueprintsPage', () => {
  it('lists blueprints with status, version and 7-day counters, linking to the detail page', () => {
    mockList(rows);
    render(<BlueprintsPage />);
    const row = screen.getByText('Lembrete — comprou').closest('tr')!;
    expect(within(row).getByText('status.ACTIVE')).toBeInTheDocument();
    expect(within(row).getByText('v2')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lembrete — comprou' })).toHaveAttribute('href', '/dashboard/platform/blueprints/b1');
  });

  it('passes an explicit `now` to relativeTime so next-intl does not fall back', () => {
    mockList(rows);
    render(<BlueprintsPage />);
    expect(relativeTime).toHaveBeenCalledWith(expect.any(Date), expect.any(Number));
  });

  // PlatformTable's `.head`/`.row` are display:grid for div lists; on a real
  // <table> they collapsed every column into one stacked cell.
  it('does not put the div-grid PlatformTable classes on real table rows', () => {
    mockList(rows);
    render(<BlueprintsPage />);
    const row = screen.getByText('Lembrete — comprou').closest('tr')!;
    const thead = screen.getByRole('table').querySelector('thead')!;
    expect(row).not.toHaveClass(tableStyles.row);
    expect(thead).not.toHaveClass(tableStyles.head);
    expect(screen.getByRole('table')).toHaveClass(tableStyles.table);
  });

  it('navigates to the detail page when a row is clicked', async () => {
    mockList(rows);
    render(<BlueprintsPage />);
    await userEvent.click(screen.getByText('Push + e-mail'));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/blueprints/b1');
  });

  it('shows the loading skeleton', () => {
    mockList(undefined, { isLoading: true });
    render(<BlueprintsPage />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the empty state with a call to action', () => {
    mockList([]);
    render(<BlueprintsPage />);
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'new' }).length).toBeGreaterThan(0);
  });

  it('shows the error state with a retry action', async () => {
    mockList(undefined, { isError: true });
    render(<BlueprintsPage />);
    expect(screen.getByText('errorState')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the flag-off banner only when the flag is disabled', () => {
    mockList(rows);
    const { rerender } = render(<BlueprintsPage blueprintsEnabled={false} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<BlueprintsPage blueprintsEnabled />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('opens the new blueprint dialog and navigates to the created blueprint', async () => {
    mockList(rows);
    render(<BlueprintsPage />);
    await userEvent.click(screen.getAllByRole('button', { name: 'new' })[0]);
    await userEvent.click(screen.getByText('confirm-create'));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/blueprints/new-id');
  });
});
