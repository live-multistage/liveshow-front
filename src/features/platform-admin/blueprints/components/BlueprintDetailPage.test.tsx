vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { toastSuccess, toastError } = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock('../queries/blueprints.queries', () => ({ useBlueprintQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({ useDeactivateBlueprintMutation: vi.fn(), useSaveBlueprintVersionMutation: vi.fn() }));

vi.mock('./RunsTable', () => ({
  RunsTable: ({ onSelectRun }: { onSelectRun: (run: unknown) => void }) => (
    <button onClick={() => onSelectRun({ id: 'r1', versionId: 'v2', version: 2, currentNodeId: null })}>select-run</button>
  ),
}));
vi.mock('./VersionsCard', () => ({ VersionsCard: () => <div>versions-card</div> }));
vi.mock('./AnalysisCard', () => ({ AnalysisCard: ({ version }: { version: { version: number } }) => <div>analysis v{version.version}</div> }));
vi.mock('./ImportJsonDialog', () => ({
  ImportJsonDialog: ({ open }: { open: boolean }) => (open ? <div>import-dialog-open</div> : null),
}));
vi.mock('./RunDrawer', () => ({
  RunDrawer: ({ run, onClose }: { run: { id: string }; onClose: () => void }) => (
    <div>run-drawer-{run.id}<button onClick={onClose}>close-drawer</button></div>
  ),
}));

Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn() }, configurable: true });

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintDetail } from '@live-show/api-contracts';
import { BlueprintDetailPage } from './BlueprintDetailPage';
import { useBlueprintQuery } from '../queries/blueprints.queries';
import { useDeactivateBlueprintMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const graph = { schemaVersion: 1 as const, nodes: [], edges: [] };
const deactivate = vi.fn();
const duplicate = vi.fn();

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
    render(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('detail.notFound')).toBeInTheDocument();
  });

  it('shows the invalid banner for an INVALID blueprint', () => {
    mockDetail(detail({ status: 'INVALID' }));
    render(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('detail.invalidBanner')).toBeInTheDocument();
  });

  it('shows the flag-off banner only when disabled', () => {
    mockDetail(detail());
    const { rerender } = render(<BlueprintDetailPage id="b1" blueprintsEnabled={false} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<BlueprintDetailPage id="b1" blueprintsEnabled />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the 7-day KPIs', () => {
    mockDetail(detail());
    render(<BlueprintDetailPage id="b1" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('asks for confirmation before deactivating, then toasts the cancelled run count', async () => {
    deactivate.mockImplementation((_data, options) => options?.onSuccess?.({ cancelledRuns: 3 }));
    mockDetail(detail({ status: 'ACTIVE' }));
    render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    await userEvent.click(screen.getByRole('button', { name: 'detail.deactivate' }));
    expect(deactivate).toHaveBeenCalledWith({ id: 'b1' }, expect.anything());
    expect(toastSuccess).toHaveBeenCalledWith('detail.deactivatedToast:{"count":3}');
  });

  it('exports the latest version graph to the clipboard and toasts success', async () => {
    mockDetail(detail());
    render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.export'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(graph, null, 2));
    expect(toastSuccess).toHaveBeenCalledWith('detail.copied');
  });

  it('duplicates the active version as a new draft', async () => {
    mockDetail(detail({ activeVersionId: 'v1' }));
    render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.duplicate'));
    expect(duplicate).toHaveBeenCalledWith({ id: 'b1', graph }, expect.anything());
  });

  it('opens the import dialog from the menu', async () => {
    mockDetail(detail());
    render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.moreActions' }));
    await userEvent.click(await screen.findByText('detail.importTitle'));
    expect(screen.getByText('import-dialog-open')).toBeInTheDocument();
  });

  it('opens the run drawer when a run row is selected and closes it', async () => {
    mockDetail(detail());
    render(<BlueprintDetailPage id="b1" />);
    await userEvent.click(screen.getByText('select-run'));
    expect(screen.getByText('run-drawer-r1')).toBeInTheDocument();
    await userEvent.click(screen.getByText('close-drawer'));
    expect(screen.queryByText('run-drawer-r1')).not.toBeInTheDocument();
  });
});
