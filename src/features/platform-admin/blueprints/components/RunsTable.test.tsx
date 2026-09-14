vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  useFormatter: () => ({ dateTime: (d: Date) => d.toISOString() }),
}));
vi.mock('../queries/blueprints.queries', () => ({ useBlueprintRunsQuery: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintRunDto } from '@live-show/api-contracts';
import { RunsTable } from './RunsTable';
import { useBlueprintRunsQuery } from '../queries/blueprints.queries';

const run: BlueprintRunDto = {
  id: 'r1', versionId: 'v2', version: 2, status: 'WAITING', currentNodeId: 'e3',
  wakeAt: '2026-10-02T18:00:00Z', errorCode: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', steps: [],
  parentRunId: null, itemIndex: null, children: null,
};

const fetchNextPage = vi.fn();
const onSelectRun = vi.fn();

function mockPages(items: BlueprintRunDto[], hasNextPage = false) {
  vi.mocked(useBlueprintRunsQuery).mockReturnValue({
    data: { pages: [{ items, nextCursor: hasNextPage ? 'cursor-1' : null }] },
    isLoading: false, hasNextPage, fetchNextPage, isFetchingNextPage: false, dataUpdatedAt: Date.now(),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RunsTable', () => {
  it('renders a run row with status, version, node and the waiting wake time', () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} />);
    const table = within(screen.getByRole('table'));
    expect(table.getByText('runStatus.WAITING')).toBeInTheDocument();
    expect(table.getByText('v2')).toBeInTheDocument();
    expect(table.getByText('e3')).toBeInTheDocument();
  });

  it('shows the empty state when there are no runs', () => {
    mockPages([]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} />);
    expect(screen.getByText('detail.noRuns')).toBeInTheDocument();
  });

  it('opens the drawer for the clicked run', async () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} />);
    await userEvent.click(screen.getByText('e3'));
    expect(onSelectRun).toHaveBeenCalledWith(run);
  });

  it('fetches the next page on "Carregar mais" only when there is one', async () => {
    mockPages([run], true);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.loadMore' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('filters by status chip', async () => {
    mockPages([run]);
    render(<RunsTable blueprintId="b1" onSelectRun={onSelectRun} />);
    await userEvent.click(screen.getByRole('button', { name: 'runStatus.FAILED' }));
    expect(useBlueprintRunsQuery).toHaveBeenLastCalledWith('b1', 'FAILED');
  });
});
