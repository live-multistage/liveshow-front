vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.rich = (key: string) => key;
    t.has = (key: string) => key !== 'errors.SOME_UNKNOWN_CODE';
    return t;
  },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { toastSuccess, toastError } = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock('../queries/blueprints.queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries/blueprints.queries')>();
  return { ...actual, useBlueprintQuery: vi.fn() };
});
vi.mock('../mutations/blueprints.mutations', () => ({ useDeactivateBlueprintMutation: vi.fn(), useSaveBlueprintVersionMutation: vi.fn() }));

vi.mock('./RunsTable', () => ({
  RunsTable: ({ onSelectRun }: { onSelectRun: (run: unknown) => void }) => (
    <button onClick={() => onSelectRun({ id: 'r1', versionId: 'v2', version: 2, currentNodeId: null, parentRunId: 'p1' })}>select-run</button>
  ),
}));
vi.mock('./VersionsCard', () => ({ VersionsCard: () => <div>versions-card</div> }));
vi.mock('./AnalysisCard', () => ({ AnalysisCard: ({ version }: { version: { version: number } }) => <div>analysis v{version.version}</div> }));
vi.mock('./ImportJsonDialog', () => ({
  ImportJsonDialog: ({ open }: { open: boolean }) => (open ? <div>import-dialog-open</div> : null),
}));
vi.mock('./RunDrawer', () => ({
  RunDrawer: ({ run, onClose, onNavigate }: { run: { id: string }; onClose: () => void; onNavigate?: (id: string) => void }) => (
    <div>
      run-drawer-{run.id}
      <button onClick={onClose}>close-drawer</button>
      {onNavigate && <button onClick={() => onNavigate('p1')}>navigate-to-parent</button>}
    </div>
  ),
}));

Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn() }, configurable: true });

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BlueprintDetail, BlueprintRunDto } from '@live-show/api-contracts';
import { BlueprintDetailPage } from './BlueprintDetailPage';
import { useBlueprintQuery } from '../queries/blueprints.queries';
import { useDeactivateBlueprintMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const graph = { schemaVersion: 1 as const, nodes: [], edges: [] };
const deactivate = vi.fn();
const duplicate = vi.fn();

function renderPage(ui: React.ReactElement, queryClient = new QueryClient()) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function detail(overrides: Partial<BlueprintDetail> = {}): BlueprintDetail {
  return {
    id: 'b1', name: 'Lembrete', description: 'Envia lembrete', status: 'ACTIVE', activeVersionId: 'v1',
    latestVersion: 1, counts7d: { started: 12, completed: 9, cancelled: 1, failed: 2 }, updatedAt: '2026-09-13T12:00:00Z',
    versions: [{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: '2026-09-01T00:00:00Z' }],
    ...overrides,
  };
}

function mockDetail(data: BlueprintDetail | undefined, overrides: Record<string, unknown> = {}) {
  vi.mocked(useBlueprintQuery).mockReturnValue({ data, isLoading: false, isError: false, ...overrides } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDeactivateBlueprintMutation).mockReturnValue({ mutate: deactivate, isPending: false } as never);
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: duplicate, isPending: false } as never);
});

describe('BlueprintDetailPage', () => {
  it('shows the not-found state when the blueprint fails to load', () => {
    mockDetail(undefined, { isError: true });
    renderPage(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('detail.notFound')).toBeInTheDocument();
  });

  it('shows the invalid banner for an INVALID blueprint', () => {
    mockDetail(detail({ status: 'INVALID' }));
    renderPage(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('detail.invalidBanner')).toBeInTheDocument();
  });

  it('shows the flag-off banner only when disabled', () => {
    mockDetail(detail());
    const queryClient = new QueryClient();
    const { rerender } = renderPage(<BlueprintDetailPage id="b1" blueprintsEnabled={false} />, queryClient);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<QueryClientProvider client={queryClient}><BlueprintDetailPage id="b1" blueprintsEnabled /></QueryClientProvider>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the 7-day KPIs', () => {
    mockDetail(detail());
    renderPage(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('asks for confirmation before deactivating, then toasts the cancelled run count', async () => {
    deactivate.mockImplementation((_data, options) => options?.onSuccess?.({ cancelledRuns: 3 }));
    mockDetail(detail({ status: 'ACTIVE' }));
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    expect(deactivate).toHaveBeenCalledWith({ id: 'b1' }, expect.anything());
    expect(toastSuccess).toHaveBeenCalledWith('detail.deactivatedToast:{"count":3}');
  });

  it('exports the latest version graph to the clipboard and toasts success', async () => {
    mockDetail(detail());
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.export'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(graph, null, 2));
    expect(toastSuccess).toHaveBeenCalledWith('detail.copied');
  });

  it('duplicates the active version as a new draft and toasts success', async () => {
    duplicate.mockImplementation((_data, options) => options?.onSuccess?.());
    mockDetail(detail({ activeVersionId: 'v1' }));
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.duplicate'));
    expect(duplicate).toHaveBeenCalledWith({ id: 'b1', graph }, expect.anything());
    expect(toastSuccess).toHaveBeenCalledWith('detail.duplicated');
  });

  it('shows GENERIC for an error code with no i18n entry, and clears it on a later success', async () => {
    deactivate.mockImplementationOnce((_data, options) => options?.onError?.({ code: 'SOME_UNKNOWN_CODE' }));
    mockDetail(detail({ status: 'ACTIVE' }));
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    expect(screen.getByRole('alert')).toHaveTextContent('errors.GENERIC');

    duplicate.mockImplementation((_data, options) => options?.onSuccess?.());
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.duplicate'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens the import dialog from the menu', async () => {
    mockDetail(detail());
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.importTitle'));
    expect(screen.getByText('import-dialog-open')).toBeInTheDocument();
  });

  it('opens the run drawer when a run row is selected and closes it', async () => {
    mockDetail(detail());
    renderPage(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByText('select-run'));
    expect(screen.getByText('run-drawer-r1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('close-drawer'));
    expect(screen.queryByText('run-drawer-r1')).not.toBeInTheDocument();
  });

  it('navigates from a child drawer to its cached parent drawer', async () => {
    mockDetail(detail());
    const parentRun: BlueprintRunDto = {
      id: 'p1', versionId: 'v2', version: 2, status: 'RUNNING', currentNodeId: 'fe',
      wakeAt: null, errorCode: null, createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', steps: [],
      parentRunId: null, itemIndex: null, children: { total: 3, running: 1, completed: 2, cancelled: 0, failed: 0 },
    };
    const queryClient = new QueryClient();
    queryClient.setQueryData(['platform-admin', 'blueprints', 'runs', 'b1', 'ALL'], {
      pages: [{ items: [parentRun], nextCursor: null }], pageParams: [undefined],
    });
    renderPage(<BlueprintDetailPage id="b1" />, queryClient);
    await userEvent.click(screen.getByText('select-run'));
    expect(screen.getByText('run-drawer-r1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('navigate-to-parent'));
    expect(screen.getByText('run-drawer-p1')).toBeInTheDocument();
  });
});
