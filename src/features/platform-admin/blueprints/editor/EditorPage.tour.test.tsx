// End-to-end test of the guided tutorial (design §A) through the REAL
// Canvas + Palette + Inspector + TourPanel — same mocking shape as
// EditorPage.flow1.test.tsx, plus mocked mutations (EditorPage.test.tsx's
// pattern) so Validar/Publicar/Ativar can be driven without a real backend.
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
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError }) }));

vi.mock('../queries/blueprints.queries', () => ({ useBlueprintQuery: vi.fn(), useBlueprintCatalogQuery: vi.fn() }));
vi.mock('../mutations/blueprints.mutations', () => ({
  useSaveBlueprintVersionMutation: vi.fn(), usePublishBlueprintVersionMutation: vi.fn(), useActivateBlueprintMutation: vi.fn(),
}));

const secretsData = vi.fn();
vi.mock('../queries/blueprint-secrets.queries', () => ({ useBlueprintSecretsQuery: () => secretsData() }));

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BlueprintAnalysisError, BlueprintDetail, BlueprintVersionDto } from '@live-show/api-contracts';
import { CATALOG } from './__fixtures__/catalog';
import { EditorPage } from './EditorPage';
import { useBlueprintCatalogQuery, useBlueprintQuery } from '../queries/blueprints.queries';
import { useActivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';

const save = vi.fn();
const publish = vi.fn();
const activate = vi.fn();

function detailData(overrides: Partial<BlueprintDetail> = {}): BlueprintDetail {
  return {
    id: 'b1', name: 'Tutorial — lembrete 24h', description: '', status: 'INACTIVE', activeVersionId: null,
    latestVersion: null, counts7d: { started: 0, completed: 0, cancelled: 0, failed: 0 }, updatedAt: '', versions: [], ...overrides,
  };
}

function mockDetail(data: BlueprintDetail) {
  vi.mocked(useBlueprintQuery).mockReturnValue({ data, isLoading: false, isError: false, isFetching: false } as never);
}

function version(overrides: Partial<BlueprintVersionDto> = {}, errors: BlueprintAnalysisError[] = []): BlueprintVersionDto {
  return { id: 'v1', version: 1, graph: { schemaVersion: 1, nodes: [], edges: [] }, analysis: { ok: errors.length === 0, errors }, publishedAt: null, ...overrides };
}

function renderEditor(extraProps: Partial<React.ComponentProps<typeof EditorPage>> = {}) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <EditorPage id="b1" tour="first" {...extraProps} />
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
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.mocked(useBlueprintCatalogQuery).mockReturnValue({ data: CATALOG, isLoading: false, isError: false } as never);
  vi.mocked(useSaveBlueprintVersionMutation).mockReturnValue({ mutate: save, isPending: false } as never);
  vi.mocked(usePublishBlueprintVersionMutation).mockReturnValue({ mutate: publish, isPending: false } as never);
  vi.mocked(useActivateBlueprintMutation).mockReturnValue({ mutate: activate, isPending: false } as never);
  secretsData.mockReturnValue({ data: [] });
});

describe('EditorPage — guided tutorial (design §A)', () => {
  it('opens on a fresh draft at step 0, with only Próximo enabled', () => {
    mockDetail(detailData());
    renderEditor();
    expect(screen.getByText('tour.steps.0.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.next' })).toBeEnabled();
  });

  it('Próximo moves to step 1, highlighting the wishlist.itemAdded palette item', async () => {
    mockDetail(detailData());
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'tour.next' }));
    expect(screen.getByText('tour.steps.1.title')).toBeInTheDocument();
    const item = screen.getByRole('button', { name: /Salvou um evento/ });
    expect(item.className).toMatch(/tourHighlight/);
  });

  it('Fazer por mim through steps 1–7 lands on step 8, with the real graph built', async () => {
    mockDetail(detailData());
    renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'tour.next' })); // step 0 → 1

    for (let i = 1; i <= 7; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'tour.doForMe' }));
    }

    expect(screen.getByText('tour.steps.8.title')).toBeInTheDocument();
    // Step 8 has no Fazer por mim / Próximo in the panel — only the real toolbar buttons apply.
    expect(screen.queryByRole('button', { name: 'tour.doForMe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'tour.next' })).not.toBeInTheDocument();
  });

  it('Validar + Publicar reach the B3 completion (published, not active); Ativar then B2', async () => {
    mockDetail(detailData());
    const { rerender } = renderEditor();
    await userEvent.click(screen.getByRole('button', { name: 'tour.next' }));
    for (let i = 1; i <= 7; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'tour.doForMe' }));
    }

    save.mockImplementation((_vars, opts) => opts.onSuccess(version({ id: 'v1', version: 1 })));
    await userEvent.click(screen.getByRole('button', { name: 'editor.validate' }));
    expect(screen.getByRole('button', { name: 'editor.publish' })).toBeEnabled();

    publish.mockImplementation((_vars, opts) => opts.onSuccess(version({ id: 'v1', version: 1, publishedAt: '2026-09-14T00:00:00Z' })));
    await userEvent.click(screen.getByRole('button', { name: 'editor.publish' }));

    expect(screen.getByText('tour.completion.pendingTitle')).toBeInTheDocument();
    const activateBtn = screen.getByRole('button', { name: 'tour.activate' });
    await userEvent.click(activateBtn);
    expect(activate).toHaveBeenCalledWith({ id: 'b1', versionId: 'v1' }, expect.anything());

    // Simulate the query refetch that follows a real activation.
    mockDetail(detailData({ activeVersionId: 'v1', versions: [version({ id: 'v1', version: 1, publishedAt: '2026-09-14T00:00:00Z' })] }));
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <EditorPage id="b1" tour="first" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('tour.completion.activeTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tour.viewRuns' })).toBeInTheDocument();
  });

  it('skipping the tour hides the panel and the toolbar chip', async () => {
    mockDetail(detailData());
    renderEditor();
    await userEvent.click(screen.getAllByRole('button', { name: 'tour.skip' })[0]);
    expect(screen.queryByText('tour.steps.0.title')).not.toBeInTheDocument();
    expect(screen.queryByText(/tour\.toolbarChip/)).not.toBeInTheDocument();
  });
});
