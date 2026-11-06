import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../shared/i18n-messages/pt.json';

// next-intl stand-in reading the real pt.json, so the copy is exercised for real.
function resolve(namespace: string, key: string): unknown {
  let node: unknown = ptMessages;
  for (const segment of [...namespace.split('.'), ...key.split('.')]) {
    node = node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined;
    if (node === undefined) return undefined;
  }
  return node;
}
vi.mock('next-intl', () => ({
  useLocale: () => 'pt',
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    const template = resolve(namespace, key);
    return typeof template === 'string'
      ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? ''))
      : key;
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('../queries/use-pages', () => ({
  usePageQuery: vi.fn(),
  usePagePreviewQuery: vi.fn(() => ({ data: undefined })),
  usePublishDiffQuery: vi.fn(() => ({ data: { added: 1, removed: 0, edited: 0, hidden: 0, hasChanges: true, nextVersionNumber: 4 } })),
  usePageVersionsQuery: vi.fn(() => ({ data: [] })),
}));
vi.mock('../mutations/use-page-mutations', () => {
  const idle = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    usePublishPageMutation: idle, useRestoreVersionMutation: idle, useUpdatePageSettingsMutation: idle,
    useUnpublishPageMutation: idle, useArchivePageMutation: idle, useUnarchivePageMutation: idle,
    useUploadPageAssetMutation: idle,
  };
});
vi.mock('../services/pages.service', () => ({
  pagesService: { saveDraft: vi.fn() },
  isDraftConflict: (e: { response?: { status?: number; data?: { code?: string } } }) =>
    e?.response?.status === 409 && e.response.data?.code === 'DRAFT_CONFLICT',
}));

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyDocument, createEmptySection, type PageDetail, type PageSection } from '@live-show/api-contracts';
import { usePageQuery } from '../queries/use-pages';
import { pagesService } from '../services/pages.service';
import { PageEditorPage } from './PageEditorPage';

const saveDraft = vi.mocked(pagesService.saveDraft);
const usePage = vi.mocked(usePageQuery);

const section = (type: 'hero' | 'final' | 'text', id: string, title: string): PageSection => {
  const base = createEmptySection(type, id);
  return { ...base, props: { ...base.props, title, paragraphs: [[{ text: 'Corpo' }]] } } as PageSection;
};

// The draft schema requires uuid section ids.
const sectionId = (page: string, n: number) => `${page.toLowerCase().repeat(8)}-${page.toLowerCase().repeat(4)}-4${page.toLowerCase().repeat(3)}-8${page.toLowerCase().repeat(3)}-${String(n).padStart(12, '0')}`;

const detail = (id: string, titles: string[]): PageDetail => ({
  id,
  title: `Página ${id}`,
  slug: `pagina-${id}`,
  kind: 'STANDALONE',
  status: 'PUBLISHED',
  hasUnpublishedChanges: false,
  publishedVersion: 3,
  draftUpdatedAt: '2026-11-05T14:32:00',
  draftUpdatedBy: null,
  sectionCount: titles.length,
  draftRevision: id === 'B' ? 7 : 1,
  seo: { noindex: false },
  draft: { ...createEmptyDocument(), sections: titles.map((t, i) => section('text', sectionId(id, i + 1), t)) },
});

const pages: Record<string, PageDetail | undefined> = {};
let query: { isLoading?: boolean; isError?: boolean; error?: unknown } = {};

function mockViewport({ narrow = false, drawer = false } = {}) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('820') ? narrow : q.includes('1360') ? drawer : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  saveDraft.mockReset();
  pages.A = detail('A', ['Alpha', 'Beta', 'Gama']);
  pages.B = detail('B', ['Outra']);
  query = {};
  usePage.mockImplementation(((id: string | null) => ({
    data: id && !query.isLoading && !query.isError ? pages[id] : undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue({}),
    ...query,
  })) as unknown as typeof usePageQuery);
  mockViewport();
});
afterEach(() => vi.useRealTimers());

const rows = () => screen.getAllByTestId('section-row');
const titlesInOrder = () => rows().map((row) => within(row).getByTestId('section-summary').textContent);

describe('PageEditorPage', () => {
  it('renders topbar, section tree and the preview/inspector slots', () => {
    render(<PageEditorPage pageId="A" />);
    expect(screen.getAllByText('Página A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/p/pagina-A').length).toBeGreaterThan(0);
    expect(screen.getByText('PUBLICADA · V3')).toBeInTheDocument();
    expect(screen.getByText('Rascunho salvo às 14:32')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeDisabled();
    expect(titlesInOrder()).toEqual(['Alpha', 'Beta', 'Gama']);
    expect(screen.getByText('3/30')).toBeInTheDocument();
    expect(screen.getByTestId('preview-slot')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-slot')).toBeInTheDocument();
  });

  it('shows a skeleton while loading and a back link on 404', () => {
    query = { isLoading: true };
    const { unmount } = render(<PageEditorPage pageId="A" />);
    expect(screen.getByTestId('editor-skeleton')).toBeInTheDocument();
    unmount();

    query = { isError: true, error: { response: { status: 404 } } };
    render(<PageEditorPage pageId="zzz" />);
    expect(screen.getByText('Página não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Páginas' })).toHaveAttribute('href', '/dashboard/platform/pages');
  });

  it('shows "not supported" at <= 820px and does not fetch', () => {
    mockViewport({ narrow: true });
    render(<PageEditorPage pageId="A" />);
    expect(screen.getByText('Edite páginas num computador')).toBeInTheDocument();
    expect(screen.queryByTestId('section-row')).not.toBeInTheDocument();
    expect(usePage).toHaveBeenCalledWith(null);
  });

  it('moves the inspector into a drawer that opens with a selection (<= 1100 layout)', async () => {
    mockViewport({ drawer: true });
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    expect(screen.queryByTestId('inspector-slot')).not.toBeInTheDocument();
    await user.click(within(rows()[1]).getByRole('button', { name: /Beta/ }));
    const drawer = screen.getByTestId('inspector-drawer');
    expect(within(drawer).getByTestId('inspector-slot')).toHaveAttribute('data-selected-id', sectionId('A', 2));
    await user.click(within(drawer).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByTestId('inspector-drawer')).not.toBeInTheDocument();
  });

  it('removes with an undo toast that restores the section at its position', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(within(rows()[1]).getByRole('button', { name: /Remover/ }));
    expect(titlesInOrder()).toEqual(['Alpha', 'Gama']);
    const toast = screen.getByRole('status');
    expect(within(toast).getByText('Seção removida')).toBeInTheDocument();
    await user.click(within(toast).getByRole('button', { name: 'Desfazer' }));
    expect(titlesInOrder()).toEqual(['Alpha', 'Beta', 'Gama']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('autosaves an edit with the page id and revision, then reports it saved', async () => {
    vi.useFakeTimers();
    saveDraft.mockResolvedValue({ draftRevision: 2, draftUpdatedAt: '2026-11-05T15:00:00' });
    render(<PageEditorPage pageId="A" />);
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    expect(screen.getByText('Salvando…')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0]).toBe('A');
    expect(saveDraft.mock.calls[0][1]).toMatchObject({ baseRevision: 1 });
    expect(screen.getByText(/^Rascunho salvo às \d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText('ALTERAÇÕES NÃO PUBLICADAS')).toBeInTheDocument();
  });

  it('shows the retry banner when the save fails', async () => {
    vi.useFakeTimers();
    saveDraft.mockRejectedValue({ response: { status: 500 } });
    render(<PageEditorPage pageId="A" />);
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o rascunho. Tentando de novo…');
    expect(screen.getByRole('button', { name: 'Tentar agora' })).toBeInTheDocument();
  });

  it('remounts on pageId change without leaking the previous page revision or edits', async () => {
    vi.useFakeTimers();
    saveDraft.mockResolvedValue({ draftRevision: 8, draftUpdatedAt: '2026-11-05T15:00:00' });
    const { rerender } = render(<PageEditorPage pageId="A" />);
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    rerender(<PageEditorPage pageId="B" />);
    expect(titlesInOrder()).toEqual(['Outra']);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveDraft).not.toHaveBeenCalled();
    fireEvent.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0]).toBe('B');
    expect(saveDraft.mock.calls[0][1]).toMatchObject({ baseRevision: 7 });
  });

  it('opens the publish dialog from the topbar once there are unpublished changes', async () => {
    saveDraft.mockResolvedValue({ draftRevision: 2, draftUpdatedAt: '2026-11-05T15:00:00' });
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(within(rows()[0]).getByRole('button', { name: /Ocultar/ }));
    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(await screen.findByRole('heading', { name: 'Publicar versão 4' })).toBeInTheDocument();
  });

  it('opens the history and settings drawers from the topbar', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(screen.getByRole('button', { name: /Histórico/ }));
    expect(screen.getByRole('dialog', { name: 'Histórico de versões' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Configurações/ }));
    expect(screen.getByRole('dialog', { name: 'Configurações da página' })).toBeInTheDocument();
  });
  it('edits the selected section in the inspector and mirrors it in the tree and the preview', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(within(rows()[1]).getByRole('button', { name: /Beta/ }));
    const title = screen.getByLabelText(/^Título/);
    await user.clear(title);
    await user.type(title, 'Novo');
    expect(titlesInOrder()).toEqual(['Alpha', 'Novo', 'Gama']);
    expect(within(screen.getByTestId('preview-slot')).getByText('Novo')).toBeInTheDocument();
  });

  it('selects a section by clicking it in the preview', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(within(screen.getByTestId('preview-slot')).getAllByRole('button', { name: /Selecionar seção/ })[2]);
    expect(screen.getByTestId('inspector-slot')).toHaveAttribute('data-selected-id', sectionId('A', 3));
  });

  it('switches the preview between desktop and phone', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    expect(screen.getByTestId('preview-slot')).toHaveAttribute('data-device', 'desktop');
    await user.click(screen.getByRole('button', { name: /Celular/ }));
    expect(screen.getByTestId('preview-slot')).toHaveAttribute('data-device', 'mobile');
    expect(screen.getByRole('button', { name: /Celular/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds a section from the library at the end and selects it', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(screen.getByRole('button', { name: 'Adicionar seção' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Biblioteca de seções' })).getByRole('button', { name: 'Adicionar Perguntas frequentes' }));
    expect(screen.queryByRole('dialog', { name: 'Biblioteca de seções' })).not.toBeInTheDocument();
    expect(rows()).toHaveLength(4);
    expect(screen.getByText('Perguntas frequentes · SEÇÃO 04')).toBeInTheDocument();
  });

  it('inserts at the position chosen in the preview', async () => {
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(screen.getAllByRole('button', { name: /Inserir seção antes de/ })[1]);
    expect(screen.getByText(/POSIÇÃO 02/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar Chamada final' }));
    expect(screen.getByText('Chamada final · SEÇÃO 02')).toBeInTheDocument();
  });

  it('blocks Publicar and reports the count while a field is invalid', async () => {
    saveDraft.mockResolvedValue({ draftRevision: 2, draftUpdatedAt: '2026-11-05T15:00:00' });
    const user = userEvent.setup();
    render(<PageEditorPage pageId="A" />);
    await user.click(screen.getAllByRole('button', { name: /Selecionar seção/ })[0]);
    await user.type(screen.getByLabelText(/^Texto/), '{Control>}a{/Control}{Backspace}');
    expect(screen.getByRole('button', { name: 'Publicar' }).parentElement).toHaveAttribute('title', 'Corrija 1 campo antes de publicar');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  });
});
