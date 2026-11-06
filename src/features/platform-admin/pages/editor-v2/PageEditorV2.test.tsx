import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../shared/i18n-messages/pt.json';

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

// Puck itself needs a layout engine jsdom lacks; this stand-in keeps what the editor wires to it: props, overrides, store.
const puck = vi.hoisted(() => {
  const store = {
    dispatch: vi.fn(),
    appState: { ui: { viewports: { current: { width: 1280, height: 'auto' }, controlsVisible: false, options: [] } } },
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
  Puck.Preview = () => react.createElement('div', { 'data-testid': 'puck-preview' });
  return { Puck, createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store) };
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  createEmptyDocument, createEmptySection, upgradePageDocument, type PageDetail, type PageDocumentV2, type PageSection,
} from '@live-show/api-contracts';
import { usePageQuery } from '../queries/use-pages';
import { pagesService } from '../services/pages.service';
import { PageEditorPage } from '../components/PageEditorPage';
import { toPuckData } from './puck-data';

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
  await screen.findByTestId('editor-canvas');
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

describe('config handed to Puck', () => {
  it('has no iframe, the three viewports and our panels', async () => {
    await mountV2(v2Document());
    expect(puck.props.iframe).toEqual({ enabled: false });
    expect(puck.props.viewports.map((v: { width: number }) => v.width)).toEqual([1280, 768, 390]);
    expect(screen.getByTestId('add-panel-placeholder')).toBeTruthy();
    expect(screen.getByTestId('layers-panel-placeholder')).toBeTruthy();
    expect(screen.getByTestId('inspector-placeholder')).toBeTruthy();
  });
});

describe('converted banner', () => {
  it('shows for a v1 draft', async () => {
    await mountV2(v1Document());
    expect(screen.getByRole('status').textContent).toContain('Esta página foi convertida para o novo editor');
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
