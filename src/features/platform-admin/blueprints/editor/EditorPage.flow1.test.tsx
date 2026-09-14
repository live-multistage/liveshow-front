// End-to-end test of the "followers reminder" flow (core.forEach branching
// into a per-follower each/done split, ticketing.hasAccess referencing the
// forEach item, and a dynamic `item` output typed from the resolved list)
// through the REAL Canvas + Inspector — only the query/mutation hooks and
// Next/toast wiring are mocked, same as EditorPage.test.tsx's mock block.
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key);
    t.has = (key: string) => key.startsWith('errors.') && key !== 'errors.UNKNOWN_CODE';
    return t;
  },
  useLocale: () => 'pt-BR',
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { push, replace, toastSuccess, toastError } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock('../queries/blueprints.queries', () => ({ useBlueprintQuery: vi.fn(), useBlueprintCatalogQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({ useSaveBlueprintVersionMutation: vi.fn(), usePublishBlueprintVersionMutation: vi.fn(), useActivateBlueprintMutation: vi.fn() }));

const secretsData = vi.fn();
vi.mock('../queries/blueprint-secrets.queries', () => ({ useBlueprintSecretsQuery: () => secretsData() }));

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BlueprintDetail, BlueprintGraph, BlueprintVersionDto } from '@live-show/api-contracts';
import reminderFollowers from './__fixtures__/reminder-followers.json';
import { CATALOG, CATALOG_MAP } from './__fixtures__/catalog';
import { EditorPage } from './EditorPage';
import { availableFields, graphToState, stateToGraph } from './useEditorGraph';
import { useBlueprintCatalogQuery, useBlueprintQuery } from '../queries/blueprints.queries';
import { useActivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const graph = reminderFollowers as BlueprintGraph;

function mockDetail(versions: BlueprintVersionDto[], activeVersionId: string | null = null) {
  const data: BlueprintDetail = {
    id: 'b1', name: 'Lembrete de seguidores', description: '', status: activeVersionId ? 'ACTIVE' : 'INACTIVE', activeVersionId,
    latestVersion: versions[0]?.version ?? null, counts7d: { started: 0, completed: 0, cancelled: 0, failed: 0 }, updatedAt: '', versions,
  };
  vi.mocked(useBlueprintQuery).mockReturnValue({ data, isLoading: false, isError: false, isFetching: false } as never);
}

function renderEditor() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <EditorPage id="b1" />
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.mocked(useBlueprintCatalogQuery).mockReturnValue({ data: CATALOG, isLoading: false, isError: false } as never);
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(usePublishBlueprintVersionMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useActivateBlueprintMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  secretsData.mockReturnValue({ data: [] });
});

describe('EditorPage — flow 1 (followers reminder), real Canvas + Inspector', () => {
  it('renders the forEach card with each/done ports and the s.followers sub-line', () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    const fCard = screen.getByText('f').closest('.react-flow__node') as HTMLElement;
    expect(fCard).toBeTruthy();
    expect(within(fCard).getByText('each')).toBeInTheDocument();
    expect(within(fCard).getByText('done')).toBeInTheDocument();
    expect(within(fCard).getByText('s.followers')).toBeInTheDocument();
  });

  it('offers f.item.userId to a (ticketing.hasAccess), reachable through the each branch', async () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    await userEvent.click(screen.getByText('a'));
    await userEvent.click(screen.getByLabelText('Usuário'));
    const option = screen.getByRole('option', { name: /item\.userId/ });
    expect(option).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('does not expose f.item.* past the done branch (end3)', () => {
    const state = graphToState(graph);
    const fields = availableFields(state, CATALOG_MAP, 'end3');
    expect(fields.some((field) => field.nodeId === 'f' && field.field === 'item')).toBe(false);
  });

  it('selecting f shows item typed as object with userId, and validates the items picker', async () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    await userEvent.click(screen.getByText('f'));
    const outputsSection = screen.getByText('editor.inspector.outputs').closest('section') as HTMLElement;
    expect(within(outputsSection).getByText('item')).toBeInTheDocument();
    expect(within(outputsSection).getByText('object')).toBeInTheDocument();
    expect(within(outputsSection).getByText('item.userId')).toBeInTheDocument();
    expect(within(outputsSection).queryByText('JSON')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Lista a percorrer'));
    const listOption = screen.getByRole('option', { name: /followers/ });
    expect(listOption).not.toHaveAttribute('aria-disabled', 'true');
    const scalarOption = screen.getByRole('option', { name: /title/ });
    expect(scalarOption).toHaveAttribute('aria-disabled', 'true');
    expect(scalarOption).toHaveTextContent('editor.fields.listRequired');
  });

  it('round-trips the loaded graph without rewriting it (positions aside)', () => {
    const out = stateToGraph(graphToState(graph));
    const stripped = { ...out, nodes: out.nodes.map(({ position: _position, ...n }) => n) };
    expect(stripped).toEqual(graph);
  });
});
