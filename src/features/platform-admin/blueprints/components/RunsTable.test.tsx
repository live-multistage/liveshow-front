vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useFormatter: () => ({ dateTime: (d: Date) => d.toISOString() }),
}));
vi.mock('../queries/blueprints.queries', () => ({ useBlueprintRunsQuery: vi.fn(), useBlueprintRunChildrenQuery: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintRunDto } from '@live-show/api-contracts';
import { RunsTable } from './RunsTable';
import { useBlueprintRunChildrenQuery, useBlueprintRunsQuery } from '../queries/blueprints.queries';

const run: BlueprintRunDto = {
  id: 'r1', versionId: 'v2', version: 2, status: 'WAITING', currentNodeId: 'e3',
  wakeAt: '2026-10-02T18:00:00Z', errorCode: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', steps: [],
  parentRunId: null, itemIndex: null, children: null,
};

const parentRun: BlueprintRunDto = {
  ...run, id: 'p1', status: 'RUNNING', currentNodeId: 'fe',
  children: { total: 12, running: 1, completed: 10, cancelled: 0, failed: 1 },
};

const noChildrenRun: BlueprintRunDto = { ...run, id: 'p2', children: { total: 0, running: 0, completed: 0, cancelled: 0, failed: 0 } };

const childRun: BlueprintRunDto = {
  id: 'c1', versionId: 'v2', version: 2, status: 'COMPLETED', currentNodeId: null,
  wakeAt: null, errorCode: null, createdAt: '2026-10-01T10:05:00Z', updatedAt: '2026-10-01T10:05:00Z', steps: [],
  parentRunId: 'p1', itemIndex: 3, children: null,
};

const fetchNextPage = vi.fn();
const childFetchNextPage = vi.fn();
const childRefetch = vi.fn();
const onSelectRun = vi.fn();
const onToggleExpand = vi.fn();

function mockPages(items: BlueprintRunDto[], hasNextPage = false) {
  vi.mocked(useBlueprintRunsQuery).mockReturnValue({
    data: { pages: [{ items, nextCursor: hasNextPage ? 'cursor-1' : null }] },
    isLoading: false, hasNextPage, fetchNextPage, isFetchingNextPage: false, dataUpdatedAt: Date.now(),
  } as never);
}

function mockChildren(overrides: Record<string, unknown> = {}) {
  vi.mocked(useBlueprintRunChildrenQuery).mockReturnValue({
    data: { pages: [{ items: [childRun], nextCursor: null }] },
    isLoading: false, isError: false, hasNextPage: false, fetchNextPage: childFetchNextPage, isFetchingNextPage: false, refetch: childRefetch,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockChildren();
});

describe('RunsTable', () => {
  it('renders a run row with status, version, node and the waiting wake time', () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    const table = within(screen.getByRole('table'));
    expect(table.getByText('runStatus.WAITING')).toBeInTheDocument();
    expect(table.getByText('v2')).toBeInTheDocument();
    expect(table.getByText('e3')).toBeInTheDocument();
  });

  it('shows the empty state when there are no runs', () => {
    mockPages([]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    expect(screen.getByText('detail.noRuns')).toBeInTheDocument();
  });

  it('opens the drawer for the clicked run', async () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    await userEvent.click(screen.getByText('e3'));
    expect(onSelectRun).toHaveBeenCalledWith(run);
  });

  it('fetches the next page on "Carregar mais" only when there is one', async () => {
    mockPages([run], true);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.loadMore' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('filters by status chip', async () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    await userEvent.click(screen.getByRole('button', { name: 'runStatus.FAILED' }));
    expect(useBlueprintRunsQuery).toHaveBeenLastCalledWith('b1', 'FAILED');
  });

  it('shows the children summary badge for a parent run and expands into child rows on chevron click', async () => {
    mockPages([parentRun]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    expect(screen.getByText(/runs\.children\.summary/)).toBeInTheDocument();
    const chevron = screen.getByRole('button', { name: 'runs.children.expand' });
    expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(chevron);
    expect(onToggleExpand).toHaveBeenCalledWith('p1');
  });

  it('flips aria-expanded when the row is expanded', () => {
    mockPages([parentRun]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId="p1" onToggleExpand={onToggleExpand} />);
    expect(screen.getByRole('button', { name: 'runs.children.collapse' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('refetches child runs when the parent poll updates the children counts', () => {
    mockPages([parentRun]);
    const { rerender } = render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId="p1" onToggleExpand={onToggleExpand} />);
    expect(childRefetch).not.toHaveBeenCalled();

    mockPages([{ ...parentRun, children: { ...parentRun.children!, running: 2, completed: 11 } }]);
    rerender(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId="p1" onToggleExpand={onToggleExpand} />);
    expect(childRefetch).toHaveBeenCalled();
  });

  it('renders child rows from the children query when the parent row is expanded', async () => {
    mockPages([parentRun]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId="p1" onToggleExpand={onToggleExpand} />);
    expect(screen.getByText('#3')).toBeInTheDocument();
    await userEvent.click(screen.getByText('#3'));
    expect(onSelectRun).toHaveBeenCalledWith(childRun);
  });

  it('shows the "0 filhos" badge with no chevron when a parent has no children', () => {
    mockPages([noChildrenRun]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId={null} onToggleExpand={onToggleExpand} />);
    expect(screen.getByText('runs.children.none')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'runs.children.expand' })).not.toBeInTheDocument();
  });

  it('shows a retry button when the children query errors, calling refetch', async () => {
    mockPages([parentRun]);
    mockChildren({ isError: true, data: undefined });
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} expandedRunId="p1" onToggleExpand={onToggleExpand} />);
    await userEvent.click(screen.getByRole('button', { name: 'runs.children.retry' }));
    expect(childRefetch).toHaveBeenCalled();
  });
});
