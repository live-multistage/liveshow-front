// End-to-end test of the "partner webhook" flow (http.request with next/error
// ports, a secret chip in a header value, and a nested error.code reference
// consumed by the notification title) through the REAL Canvas + Inspector —
// only the query/mutation hooks and Next/toast wiring are mocked, same as
// EditorPage.test.tsx's mock block.
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
import partnerWebhook from './__fixtures__/partner-webhook.json';
import { CATALOG } from './__fixtures__/catalog';
import { EditorPage } from './EditorPage';
import { useBlueprintCatalogQuery, useBlueprintQuery } from '../queries/blueprints.queries';
import { useActivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const graph = partnerWebhook as BlueprintGraph;

function mockDetail(versions: BlueprintVersionDto[], activeVersionId: string | null = null) {
  const data: BlueprintDetail = {
    id: 'b1', name: 'Webhook do parceiro', description: '', status: activeVersionId ? 'ACTIVE' : 'INACTIVE', activeVersionId,
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
  secretsData.mockReturnValue({ data: [{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }] });
});

describe('EditorPage — flow 2 (partner webhook), real Canvas + Inspector', () => {
  it('renders every node as a card, with next/error handles on the http.request card', () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    const { container } = renderEditor();

    // 5 nodes: t, h, n, end, end2.
    for (const id of ['t', 'h', 'n', 'end', 'end2']) {
      expect(screen.getByText(id)).toBeInTheDocument();
    }
    const hCard = screen.getByText('h').closest('.react-flow__node') as HTMLElement;
    expect(hCard).toBeTruthy();
    expect(within(hCard).getByText('editor.ports.error')).toBeInTheDocument();
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThan(0);
  });

  it('selecting h shows the headers rows with the secrets.PARTNER chip', async () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    await userEvent.click(screen.getByText('h'));
    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument();
    await userEvent.click(screen.getAllByText('editor.fields.addVariable')[0]);
    expect(screen.getByText('secrets.PARTNER')).toBeInTheDocument();
  });

  it('selecting n shows h.error.code in the variable picker for the title field', async () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    await userEvent.click(screen.getByText('n'));
    const title = screen.getByLabelText('Título');
    expect(title).toHaveValue('Webhook falhou: {{h.error.code}}');
    const titleField = title.parentElement as HTMLElement;
    await userEvent.click(within(titleField).getByText('editor.fields.addVariable'));
    expect(screen.getByText('{{h.error.code}}')).toBeInTheDocument();
  });

  it('reports no problems in the footer for a clean analysis', () => {
    mockDetail([{ id: 'v1', version: 1, graph, analysis: { ok: true, errors: [] }, publishedAt: null }]);
    renderEditor();

    expect(screen.queryByText(/editor\.problems:/)).not.toBeInTheDocument();
  });
});
