import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../shared/i18n-messages/pt.json';
import enMessages from '../../../../../shared/i18n-messages/en.json';
import esMessages from '../../../../../shared/i18n-messages/es.json';

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
    return typeof template === 'string' ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? '')) : key;
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('../queries/use-pages', () => ({
  usePageQuery: vi.fn(),
  usePagePreviewQuery: vi.fn(() => ({ data: undefined })),
  usePublishDiffQuery: vi.fn(() => ({ data: { added: 1, removed: 0, edited: 0, hidden: 0, hasChanges: true, nextVersionNumber: 4 } })),
  usePageVersionsQuery: vi.fn(() => ({ data: [] })),
}));
const publishMutate = vi.hoisted(() => vi.fn());
vi.mock('../mutations/use-page-mutations', () => {
  const idle = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    usePublishPageMutation: () => ({ mutateAsync: publishMutate, isPending: false }), useRestoreVersionMutation: idle, useUpdatePageSettingsMutation: idle,
    useUnpublishPageMutation: idle, useArchivePageMutation: idle, useUnarchivePageMutation: idle,
    useUploadPageAssetMutation: idle,
  };
});
const live = vi.hoisted(() => ({ value: { resolved: { rails: {}, featured: {}, live: {} }, loading: [] as string[], unsendable: [] as string[] } as { resolved: Record<string, Record<string, unknown>>; loading: string[]; unsendable: string[] } }));
vi.mock('./use-resolve-data', () => ({ useResolveData: () => live.value }));
vi.mock('../queries/use-page-blocks', () => ({
  usePageBlocksQuery: () => ({ data: [], isPending: false, isError: false }),
  useCreatePageBlockMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));
vi.mock('../services/pages.service', () => ({
  pagesService: { saveDraft: vi.fn() },
  isDraftConflict: (e: { response?: { status?: number; data?: { code?: string } } }) =>
    e?.response?.status === 409 && e.response.data?.code === 'DRAFT_CONFLICT',
}));

// Puck itself needs a layout engine jsdom lacks; this stand-in keeps what the editor wires to it: props, overrides, store.
const puck = vi.hoisted(() => {
  const store = {
    dispatch: vi.fn(),
    selectedItem: null,
    getSelectorForId: vi.fn(),
    getParentById: vi.fn(() => null),
    appState: { data: { root: { props: {} }, content: [] }, ui: { viewports: { current: { width: 1280, height: 'auto' }, controlsVisible: false, options: [] } } },
    history: { back: vi.fn(), forward: vi.fn(), hasPast: true, hasFuture: false },
  };
  return { store, props: {} as Record<string, any> };
});
vi.mock('@puckeditor/core/puck.css', () => ({}));
vi.mock('@puckeditor/core', async () => {
  const react = await import('react');
  const Puck = (props: Record<string, any>) => {
    puck.props = props;
    return react.createElement('div', { 'data-testid': 'puck' }, props.children);
  };
  const slot = (name: string) => () => react.createElement(react.Fragment, null, puck.props.overrides[name]());
  Puck.Components = slot('components');
  Puck.Outline = slot('outline');
  Puck.Fields = slot('fields');
  const Drawer = (props: { children: React.ReactNode }) => react.createElement('div', null, props.children);
  Drawer.Item = (props: { name: string; children: () => React.ReactNode }) => react.createElement('div', null, props.children());
  Puck.Preview = () => react.createElement('div', { 'data-testid': 'puck-preview' });
  return { Puck, Drawer, createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store) };
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  createEmptyDocument, createEmptySection, upgradePageDocument, type PageDetail, type PageDocumentV2, type PageSection,
} from '@live-show/api-contracts';
import { usePageQuery } from '../queries/use-pages';
import { pagesService } from '../services/pages.service';
import { PageEditorPage } from '../components/PageEditorPage';
import { toPuckData } from './puck-data';
import fixture from '../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';

const saveDraft = vi.mocked(pagesService.saveDraft);
const usePage = vi.mocked(usePageQuery);

const SECTION_ID = '11111111-1111-4111-8111-111111111111';
const v1Section = (): PageSection => {
  const base = createEmptySection('text', SECTION_ID);
  return { ...base, props: { ...base.props, title: 'Olá', paragraphs: [[{ text: 'Corpo' }]] } } as PageSection;
};
const v1Document = () => ({ ...createEmptyDocument(), sections: [v1Section()] });
const v2Document = (): PageDocumentV2 => upgradePageDocument(v1Document());

const detail = (draft: PageDetail['draft']): PageDetail => ({
  id: 'P', title: 'Página P', slug: 'pagina-p', kind: 'STANDALONE', status: 'PUBLISHED', hasUnpublishedChanges: false,
  publishedVersion: 3, draftUpdatedAt: '2026-11-05T14:32:00', draftUpdatedBy: null, sectionCount: 1, draftRevision: 5,
  seo: { noindex: false }, draft,
});

const editedDocument = (): PageDocumentV2 => {
  const doc = v2Document();
  const section = doc.content[0];
  return { ...doc, content: [{ ...section, props: { ...section.props, name: 'Editada' } }] };
};
const edit = () => act(async () => { puck.props.onChange(toPuckData(editedDocument())); });
const mountV2 = async (draft: PageDetail['draft']) => {
  usePage.mockReturnValue({ data: detail(draft), isError: false, refetch: vi.fn() } as never);
  render(<PageEditorPage pageId="P" v2 />);
  // The editor is a lazy chunk: its first import is slow when the whole suite runs in parallel.
  await screen.findByTestId('editor-canvas', undefined, { timeout: 10_000 });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  saveDraft.mockReset();
  saveDraft.mockResolvedValue({ draftRevision: 6, draftUpdatedAt: '2026-11-06T10:00:00' });
  puck.store.dispatch.mockReset();
  puck.store.history.back.mockReset();
  puck.store.history.forward.mockReset();
  puck.store.history.hasPast = true;
});
afterEach(() => vi.useRealTimers());

describe('route', () => {
  it('opens a document with all 19 element types, faq and iconList included, without crashing', async () => {
    await mountV2(fixture as unknown as PageDocumentV2);
    expect(screen.getByTestId('puck')).toBeTruthy();
  });

  it('flag on opens the Puck editor, off opens the v1 editor', async () => {
    await mountV2(v1Document());
    expect(screen.getByTestId('puck')).toBeTruthy();
  });

  it('flag off with a v1 draft opens the v1 editor, not Puck', () => {
    usePage.mockReturnValue({ data: detail(v1Document()), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" />);
    expect(screen.queryByTestId('puck')).toBeNull();
    expect(screen.queryByTestId('v2-read-only')).toBeNull();
  });

  it('flag off with a v2 draft shows the read-only notice', () => {
    usePage.mockReturnValue({ data: detail(v2Document()), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" />);
    expect(screen.getByTestId('v2-read-only').textContent).toContain('Esta página usa o novo editor');
    expect(screen.queryByTestId('puck')).toBeNull();
  });
});

const withDraft = (document: PageDocumentV2) => ({ ...detail(document), hasUnpublishedChanges: true });
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const featuredDocument = (): PageDocumentV2 => ({
  schemaVersion: 2, context: { type: 'none' }, root: { props: {} },
  content: [{ type: 'section', props: { id: U(1), name: 'Programação', items: [{ type: 'featuredEvent', props: { id: U(2), eventId: U(3) } }] } }],
} as unknown as PageDocumentV2);
const openPublish = () => fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

describe('publish', () => {
  it('stays available with errors: the dialog lists them instead of the topbar blocking the click', async () => {
    const broken = featuredDocument();
    (broken.content[0].props as { items: unknown[] }).items = [{ type: 'button', props: { id: U(5), label: 'Ir', href: 'javascript:alert(1)' } }];
    usePage.mockReturnValue({ data: withDraft(broken), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" v2 />);
    await screen.findByTestId('editor-canvas');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
    openPublish();
    expect(await screen.findByRole('heading', { name: 'Corrija 1 erro antes de publicar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Botão em Programação:/ })).toBeInTheDocument();
  });

  it('FEATURED_UNAVAILABLE from the back marks the element and the dialog turns into the error list', async () => {
    publishMutate.mockRejectedValueOnce({ featuredUnavailable: { code: 'FEATURED_UNAVAILABLE', elementId: U(2) } });
    usePage.mockReturnValue({ data: withDraft(featuredDocument()), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" v2 />);
    await screen.findByTestId('editor-canvas');
    openPublish();
    fireEvent.change(await screen.findByLabelText(/Resumo da mudança/), { target: { value: 'x' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publicar versão 4' })); });
    expect(await screen.findByRole('heading', { name: 'Corrija 1 erro antes de publicar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Evento em destaque em Programação: Evento indisponível/ })).toBeInTheDocument();
  });

  it('the mark goes away when the author picks another event', async () => {
    publishMutate.mockRejectedValueOnce({ featuredUnavailable: { code: 'FEATURED_UNAVAILABLE', elementId: U(2) } });
    usePage.mockReturnValue({ data: withDraft(featuredDocument()), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" v2 />);
    await screen.findByTestId('editor-canvas');
    openPublish();
    fireEvent.change(await screen.findByLabelText(/Resumo da mudança/), { target: { value: 'x' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publicar versão 4' })); });
    await screen.findByRole('heading', { name: 'Corrija 1 erro antes de publicar' });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    const other = featuredDocument();
    ((other.content[0].props as { items: { props: { eventId: string } }[] }).items[0].props).eventId = U(4);
    await act(async () => { puck.props.onChange(toPuckData(other)); });
    openPublish();
    expect(await screen.findByRole('heading', { name: 'Publicar versão 4' })).toBeInTheDocument();
  });
});

describe('screen sizes', () => {
  const matchWidth = (matches: (query: string) => boolean) => {
    window.matchMedia = ((query: string) => ({ matches: matches(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
  };
  afterEach(() => { delete (window as { matchMedia?: unknown }).matchMedia; });

  it('narrow (< 1280px): the inspector is a drawer, open only while something is selected', async () => {
    matchWidth((q) => q.includes('1279px'));
    await mountV2(v2Document());
    expect(screen.getByTestId('editor-inspector')).toHaveAttribute('data-open', 'false');
  });

  it('wide: the inspector is a column, always there', async () => {
    matchWidth(() => false);
    await mountV2(v2Document());
    expect(screen.getByTestId('editor-inspector')).toHaveAttribute('data-open', 'true');
  });

  it('on a phone: "Edite em uma tela maior", with the preview and the way back, instead of the editor', async () => {
    matchWidth((q) => q.includes('1023px'));
    usePage.mockReturnValue({ data: detail(v2Document()), isError: false, refetch: vi.fn() } as never);
    render(<PageEditorPage pageId="P" v2 />);
    expect(screen.getByRole('heading', { name: 'Edite em uma tela maior' })).toBeInTheDocument();
    expect(screen.queryByTestId('puck')).toBeNull();
    expect(screen.getByRole('link', { name: 'Voltar para páginas' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir prévia' }));
    expect(screen.getByTestId('phone-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Edite em uma tela maior' })).toBeInTheDocument();
  });
});

describe('event data on the canvas', () => {
  it('hands the renderers what was fetched for the editor state, over the preview of the saved draft, and who is loading', async () => {
    live.value = { resolved: { rails: { 'eventRail-new': [] }, featured: {}, live: {} }, loading: ['eventRail-loading'], unsendable: [] };
    await mountV2(v2Document());
    expect(puck.props.metadata.resolved.rails).toEqual({ 'eventRail-new': [] });
    expect(puck.props.metadata.loading).toEqual(['eventRail-loading']);
    live.value = { resolved: { rails: {}, featured: {}, live: {} }, loading: [], unsendable: [] };
  });

  it('drops the saved answer of a featured event that was cleared in the editor', async () => {
    const preview = await import('../queries/use-pages');
    vi.mocked(preview.usePagePreviewQuery).mockReturnValue({ data: { resolved: { rails: { keep: [] }, featured: { gone: { id: 'e' } }, live: {} } } } as never);
    live.value = { resolved: { rails: {}, featured: {}, live: {} }, loading: [], unsendable: ['gone'] };
    await mountV2(v2Document());
    expect(puck.props.metadata.resolved.featured).toEqual({});
    expect(puck.props.metadata.resolved.rails).toEqual({ keep: [] });
    vi.mocked(preview.usePagePreviewQuery).mockReturnValue({ data: undefined } as never);
    live.value = { resolved: { rails: {}, featured: {}, live: {} }, loading: [], unsendable: [] };
  });

  it('hands the renderers the editor copy in the current language', async () => {
    await mountV2(v2Document());
    expect(puck.props.metadata.labels.railNoneLive).toBe('Nenhum evento ao vivo agora');
    expect(puck.props.metadata.labels.railNoneCategory('MUSIC')).toBe('Nenhum evento para “MUSIC”');
  });
});

describe('config handed to Puck', () => {
  it('has no iframe, the three viewports and our panels', async () => {
    await mountV2(v2Document());
    expect(puck.props.iframe).toEqual({ enabled: false });
    expect(puck.props.viewports.map((v: { width: number }) => v.width)).toEqual([1280, 768, 390]);
    expect(screen.getByRole('tab', { name: 'Widgets' })).toBeTruthy();
    expect(screen.getByText('A página ainda não tem elementos.')).toBeTruthy();
    expect(screen.getByTestId('inspector-empty')).toBeTruthy();
  });
});

describe('converted banner', () => {
  it('shows for a v1 draft', async () => {
    await mountV2(v1Document());
    expect(screen.getByRole('status').textContent).toContain('Esta página foi convertida para o novo editor');
  });

  it('does not show for a blank v1 draft: there is nothing converted', async () => {
    await mountV2(createEmptyDocument());
    expect(screen.queryByText('Esta página foi convertida para o novo editor.')).toBeNull();
  });

  it('does not show for a v2 draft', async () => {
    await mountV2(v2Document());
    expect(screen.queryByText(/foi convertida para o novo editor/)).toBeNull();
  });
});

describe('autosave', () => {
  it('sends the v2 document with the revision held in state, and chains the next save on the returned one', async () => {
    await mountV2(v2Document());
    await edit();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    const [id, body] = saveDraft.mock.calls[0];
    expect(id).toBe('P');
    expect(body.baseRevision).toBe(5);
    expect((body.document as PageDocumentV2).schemaVersion).toBe(2);
    expect((body.document as PageDocumentV2).content[0].props.name).toBe('Editada');

    await act(async () => { puck.props.onChange(toPuckData({ ...editedDocument(), content: [{ ...editedDocument().content[0], props: { ...editedDocument().content[0].props, name: 'Outra' } }] })); });
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(saveDraft.mock.calls[1][1].baseRevision).toBe(6);
  });

  it('does not save when Puck reports the unchanged document', async () => {
    await mountV2(v2Document());
    await act(async () => { puck.props.onChange(toPuckData(v2Document())); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveDraft).not.toHaveBeenCalled();
  });
});

describe('conflict', () => {
  it('locks editing and offers to copy the changes and to load the current version', async () => {
    saveDraft.mockRejectedValue({ response: { status: 409, data: { code: 'DRAFT_CONFLICT', currentRevision: 9, updatedBy: { id: 'u', name: 'Ana Lima' }, updatedAt: '2026-11-06T14:35:00' } } });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await mountV2(v2Document());
    await edit();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });

    expect(screen.getByRole('alert').textContent).toContain('Ana Lima salvou esta página');
    expect(puck.props.permissions).toEqual({ drag: false, duplicate: false, delete: false, edit: false, insert: false });
    expect((screen.getByRole('button', { name: 'Desfazer' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Publicar' }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar minhas alterações' })); });
    expect(JSON.parse(writeText.mock.calls[0][0]).schemaVersion).toBe(2);
    expect(screen.getByRole('button', { name: 'Carregar versão atual' })).toBeTruthy();
  });
});

describe('conflict and the keyboard', () => {
  it('ignores what Puck reports while locked: Cmd+Z does not change the document nor the copied changes', async () => {
    saveDraft.mockRejectedValue({ response: { status: 409, data: { code: 'DRAFT_CONFLICT', currentRevision: 9, updatedBy: null, updatedAt: '2026-11-06T14:35:00' } } });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await mountV2(v2Document());
    await edit();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    await act(async () => { puck.props.onChange(toPuckData(v2Document())); });

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copiar minhas alterações' })); });
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual(editedDocument());
  });

  it('keeps Cmd+Z and Cmd+Y away from Puck (which binds them on the document) while locked', async () => {
    saveDraft.mockRejectedValue({ response: { status: 409, data: { code: 'DRAFT_CONFLICT', currentRevision: 9, updatedBy: null, updatedAt: '2026-11-06T14:35:00' } } });
    const reachedPuck = vi.fn();
    document.addEventListener('keydown', reachedPuck);
    await mountV2(v2Document());
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(reachedPuck).toHaveBeenCalledTimes(1);

    await edit();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'a', metaKey: true });
    document.removeEventListener('keydown', reachedPuck);
    expect(reachedPuck).toHaveBeenCalledTimes(2);
  });
});

describe('puck dictionary', () => {
  it('comes from the messages, in every locale', async () => {
    await mountV2(v2Document());
    expect(puck.props.dictionary).toEqual(ptMessages.platformAdmin.pageEditorV2.puck);
    const keys = Object.keys(ptMessages.platformAdmin.pageEditorV2.puck);
    expect(Object.keys(enMessages.platformAdmin.pageEditorV2.puck)).toEqual(keys);
    expect(Object.keys(esMessages.platformAdmin.pageEditorV2.puck)).toEqual(keys);
  });
});

describe('duplicate', () => {
  it('cleans the anchors and h1 Puck copied, after the action', async () => {
    await mountV2(v2Document());
    puck.props.onAction({ type: 'duplicate' });
    expect(puck.store.dispatch).not.toHaveBeenCalled();
    await act(async () => { await Promise.resolve(); });
    expect(puck.store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'setData' }));
  });
});

describe('topbar', () => {
  it('the breakpoint selector moves the Puck viewport', async () => {
    await mountV2(v2Document());
    fireEvent.click(screen.getByRole('button', { name: 'Tablet' }));
    expect(puck.store.dispatch).toHaveBeenCalledWith({
      type: 'setUi',
      ui: { viewports: expect.objectContaining({ current: { width: 768, height: 'auto' } }) },
    });
  });

  it('undo and redo call the Puck history', async () => {
    puck.store.history.hasFuture = true;
    await mountV2(v2Document());
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(puck.store.history.back).toHaveBeenCalledTimes(1);
    expect(puck.store.history.forward).toHaveBeenCalledTimes(1);
  });
});
