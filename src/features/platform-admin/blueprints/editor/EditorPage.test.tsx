vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = (key: string) => key.startsWith('errors.') && key !== 'errors.UNKNOWN_CODE';
    return t;
  },
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { push, replace, toastSuccess, toastError } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock('../queries/blueprints.queries', () => ({ useBlueprintQuery: vi.fn(), useBlueprintCatalogQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({ useSaveBlueprintVersionMutation: vi.fn(), usePublishBlueprintVersionMutation: vi.fn(), useActivateBlueprintMutation: vi.fn() }));
// React Flow needs real layout; the canvas is exercised through the reducer tests.
vi.mock('./Canvas', () => ({
  Canvas: ({ state, focus }: { state: { nodes: unknown[] }; focus: { id: string } | null }) => (
    <div data-testid="canvas">{state.nodes.length} nodes · focus {focus?.id ?? 'none'}</div>
  ),
}));
vi.mock('./Inspector', () => ({ Inspector: ({ readOnly }: { readOnly: boolean }) => <div>inspector {readOnly ? 'read-only' : 'editable'}</div> }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BlueprintDetail, BlueprintGraph, BlueprintVersionDto } from '@live-show/api-contracts';
import buyers from './__fixtures__/reminder-buyers.json';
import { CATALOG } from './__fixtures__/catalog';
import { EditorPage } from './EditorPage';
import { useBlueprintCatalogQuery, useBlueprintQuery } from '../queries/blueprints.queries';
import { useActivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const graph = buyers as BlueprintGraph;
const save = vi.fn();
const publish = vi.fn();

function version(overrides: Partial<BlueprintVersionDto> = {}): BlueprintVersionDto {
  return { id: 'v2', version: 2, graph, analysis: { ok: true, errors: [] }, publishedAt: null, ...overrides };
}

function mockDetail(versions: BlueprintVersionDto[], activeVersionId: string | null = null) {
  const data: BlueprintDetail = {
    id: 'b1', name: 'Lembrete — quem comprou', description: '', status: activeVersionId ? 'ACTIVE' : 'INACTIVE', activeVersionId,
    latestVersion: versions[0]?.version ?? null, counts7d: { started: 0, completed: 0, cancelled: 0, failed: 0 }, updatedAt: '', versions,
  };
  vi.mocked(useBlueprintQuery).mockReturnValue({ data, isLoading: false, isError: false, isFetching: false } as never);
}

function setWidth(wide: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  setWidth(true);
  vi.mocked(useBlueprintCatalogQuery).mockReturnValue({ data: CATALOG, isLoading: false, isError: false } as never);
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: save, isPending: false } as never);
  vi.mocked(usePublishBlueprintVersionMutation).mockReturnValue({ mutate: publish, isPending: false } as never);
  vi.mocked(useActivateBlueprintMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe('EditorPage', () => {
  it('asks for a larger screen below 1280px', () => {
    setWidth(false);
    mockDetail([version()]);
    render(<EditorPage id="b1" />);
    expect(screen.getByText('editor.smallScreen')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'editor.back' })).toHaveAttribute('href', '/dashboard/platform/blueprints/b1');
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('loads the latest draft editable, with the draft badge and summary', () => {
    mockDetail([version()]);
    render(<EditorPage id="b1" />);
    expect(screen.getByText('editor.badge.draft v2')).toBeInTheDocument();
    expect(screen.getByText('editor.summary:{"nodes":8,"edges":8}')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveTextContent('8 nodes');
    expect(screen.getByText('inspector editable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'editor.publish' })).toBeEnabled();
  });

  it('opens an active version read-only with the banner and duplicate action', async () => {
    mockDetail([version({ id: 'v3', version: 3, publishedAt: '2026-09-10T00:00:00Z' })], 'v3');
    save.mockImplementation((_vars, opts) => opts.onSuccess(version({ id: 'v4', version: 4 })));
    render(<EditorPage id="b1" versionId="v3" nodeId="c" />);

    expect(screen.getByText('editor.badge.active v3 · editor.badge.readOnly')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('editor.readOnlyBanner');
    expect(screen.getByText('inspector read-only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pedido pago/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'editor.saveDraft' })).not.toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveTextContent('focus c');

    await userEvent.click(screen.getByRole('button', { name: 'editor.duplicateAsDraft' }));
    expect(save).toHaveBeenCalledWith({ id: 'b1', graph }, expect.anything());
    expect(replace).toHaveBeenCalledWith('/dashboard/platform/blueprints/b1/editor?version=v4');
  });

  it('shows the empty state for a new blueprint', () => {
    mockDetail([]);
    render(<EditorPage id="b1" />);
    expect(screen.getByText('editor.badge.draft')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveTextContent('0 nodes');
  });

  it('save POSTs the serialized graph, then maps analysis errors to the footer and blocks publishing', async () => {
    mockDetail([version()]);
    const analysis = { ok: false, errors: [{ nodeId: 'e2', code: 'INVALID_CONFIG' as const, message: '"eventId" is required' }] };
    save.mockImplementation((_vars, opts) => { opts.onSuccess(version({ id: 'v5', version: 5, analysis })); opts.onSettled?.(); });
    render(<EditorPage id="b1" />);

    await userEvent.click(screen.getByRole('button', { name: 'editor.saveDraft' }));
    const [[vars]] = save.mock.calls;
    expect(vars.id).toBe('b1');
    expect(vars.graph.edges).toEqual(graph.edges);
    expect(vars.graph.nodes.map(({ position: _p, ...n }: { position?: unknown }) => n)).toEqual(graph.nodes);
    expect(vars.graph.nodes.every((n: { position?: unknown }) => n.position)).toBe(true);

    expect(toastSuccess).toHaveBeenCalledWith('editor.savedToast:{"version":5,"count":1}');
    expect(screen.getByText('editor.badge.draft v5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /e2.*errors.INVALID_CONFIG/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'editor.publish' })).toBeDisabled();
  });

  it('"Validar" also saves a version (no dry-run endpoint)', async () => {
    mockDetail([version()]);
    render(<EditorPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'editor.validate' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), expect.anything());
  });

  it('publishes the clean saved draft', async () => {
    mockDetail([version()]);
    publish.mockImplementation((_vars, opts) => opts.onSuccess(version({ publishedAt: '2026-09-13T00:00:00Z' })));
    render(<EditorPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'editor.publish' }));
    expect(publish).toHaveBeenCalledWith({ id: 'b1', versionId: 'v2' }, expect.anything());
    expect(toastSuccess).toHaveBeenCalledWith('editor.publishedToast:{"version":2}');
    expect(screen.getByText('editor.badge.published v2')).toBeInTheDocument();
  });

  it('keeps Publicar disabled when the loaded draft has errors', () => {
    mockDetail([version({ analysis: { ok: false, errors: [{ code: 'NO_TRIGGER', message: 'x' }] } })]);
    render(<EditorPage id="b1" />);
    expect(screen.getByRole('button', { name: 'editor.publish' })).toBeDisabled();
    expect(screen.getByText('detail.versionErrorCount:{"count":1}')).toBeInTheDocument();
  });

  it('surfaces a save failure as a translated toast, generic for unknown codes', async () => {
    mockDetail([version()]);
    save.mockImplementation((_vars, opts) => { opts.onError({ code: 'UNKNOWN_CODE' }); opts.onSettled?.(); });
    render(<EditorPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'editor.saveDraft' }));
    expect(toastError).toHaveBeenCalledWith('errors.GENERIC');
  });

  it('asks before leaving with unsaved changes', async () => {
    mockDetail([version()]);
    render(<EditorPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: /Fim/ }));
    await userEvent.click(screen.getByRole('button', { name: 'editor.back' }));
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'editor.discard' }));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/blueprints/b1');
  });

  it('leaves directly when there is nothing to lose', async () => {
    mockDetail([version()]);
    render(<EditorPage id="b1" />);
    await userEvent.click(screen.getByRole('button', { name: 'editor.back' }));
    expect(push).toHaveBeenCalledWith('/dashboard/platform/blueprints/b1');
  });
});
