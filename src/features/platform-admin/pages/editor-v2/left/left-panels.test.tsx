import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ptMessages from '../../../../../../shared/i18n-messages/pt.json';

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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const blocks = vi.hoisted(() => ({
  list: { data: [] as unknown[], isPending: false, isError: false },
  mutate: vi.fn(),
  error: null as unknown,
}));
vi.mock('../../queries/use-page-blocks', () => ({
  usePageBlocksQuery: () => ({ ...blocks.list, refetch: vi.fn() }),
  useCreatePageBlockMutation: () => ({ mutate: blocks.mutate, isPending: false, isError: !!blocks.error, error: blocks.error }),
}));

const puck = vi.hoisted(() => ({
  store: { dispatch: vi.fn(), selectedItem: null as unknown, getSelectorForId: vi.fn(() => ({ index: 0, zone: 'root:default-zone' })), appState: { data: { root: { props: {} }, content: [] as unknown[] } } },
}));
vi.mock('@puckeditor/core', async () => {
  const react = await import('react');
  const Drawer = (props: { children: React.ReactNode }) => react.createElement('div', null, props.children);
  Drawer.Item = (props: { children: () => React.ReactNode }) => react.createElement('div', null, props.children());
  return { Drawer, createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store) };
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  pageDraftV2Schema, walkElements, type PageDocumentV2, type PageElement,
} from '@live-show/api-contracts';
import { AddPanel } from './AddPanel';
import { LayersPanel } from './LayersPanel';
import { READY_BLOCKS } from './ready-blocks';
import { SaveAsBlockProvider, useSaveAsBlock } from './SaveAsBlock';
import { idOf } from './tree-ops';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const el = (type: string, id: string, props: object = {}) => ({ type, props: { id, ...props } }) as unknown as PageElement;
const page = (): PageElement[] => [
  el('section', U(1), { items: [
    el('heading', U(2), { text: 'Olá', tag: 'h2' }),
    el('columns', U(3), { style: { desktop: {}, tablet: { gap: 'sm' } }, items: [el('column', U(4), { items: [] }), el('column', U(5), { items: [] })] }),
  ] }),
];

function setPage(content: PageElement[], selectedId?: string) {
  puck.store.appState.data.content = content;
  puck.store.selectedItem = selectedId ? { props: { id: selectedId } } : null;
}
const lastSetData = () => {
  const call = puck.store.dispatch.mock.calls.map(([a]) => a).filter((a) => a.type === 'setData').at(-1);
  return call as { data: (prev: { content: PageElement[] }) => { content: PageElement[] }; recordHistory: boolean };
};

beforeEach(() => {
  vi.clearAllMocks();
  blocks.list = { data: [], isPending: false, isError: false };
  blocks.error = null;
  setPage(page());
});

describe('AddPanel › Widgets', () => {
  it('lists the four groups and flags the data widgets as real data', () => {
    render(<AddPanel />);
    ['Estrutura', 'Básico', 'Conteúdo', 'Eventos'].forEach((name) => expect(screen.getByRole('region', { name })).toBeTruthy());
    expect(within(screen.getByRole('region', { name: 'Eventos' })).getByText('Dados reais')).toBeTruthy();
  });

  it('search filters the widgets and shows an empty message', () => {
    render(<AddPanel />);
    const search = screen.getByRole('searchbox', { name: 'Buscar widget' });
    fireEvent.change(search, { target: { value: 'trilho' } });
    expect(screen.getByText('Trilho de eventos')).toBeTruthy();
    expect(screen.queryByText('Título')).toBeNull();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum widget encontrado.')).toBeTruthy();
  });

  it('dims what fits nowhere and explains why; it does not insert', () => {
    render(<AddPanel />); // nothing selected: only sections fit
    const heading = screen.getByRole('button', { name: 'Título' });
    expect(heading.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(heading);
    expect(puck.store.dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Seção' }).getAttribute('aria-disabled')).toBe('false');
  });

  it('climbs from the selection to the closest place that accepts the widget', () => {
    setPage(page(), U(3)); // columns takes only columns: a heading goes right after it, in the section
    render(<AddPanel />);
    const heading = screen.getByRole('button', { name: 'Título' });
    expect(heading.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(heading);
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'insert', componentType: 'heading', destinationIndex: 2, destinationZone: `${U(1)}:items` });
  });

  it('with nothing selected only sections fit, at the page root', () => {
    render(<AddPanel />);
    expect(screen.getByRole('button', { name: 'Título' }).getAttribute('title')).toContain('Direto na página só entram seções');
    fireEvent.click(screen.getByRole('button', { name: 'Seção' }));
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'insert', componentType: 'section', destinationIndex: 1, destinationZone: 'root:default-zone' });
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 1, zone: 'root:default-zone' } } });
  });

  it('a click inserts inside the selected element, at its end', () => {
    setPage(page(), U(4));
    render(<AddPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Título' }));
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'insert', componentType: 'heading', destinationIndex: 0, destinationZone: `${U(4)}:items` });
  });
});

describe('AddPanel › Blocos', () => {
  const openBlocks = () => fireEvent.click(screen.getByRole('tab', { name: 'Blocos' }));

  it('the 12 ready blocks are valid sections', () => {
    expect(READY_BLOCKS).toHaveLength(12);
    const doc = { schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content: READY_BLOCKS.map((b) => b.element) } as unknown as PageDocumentV2;
    expect(pageDraftV2Schema.safeParse(doc).success).toBe(true);
  });

  it('inserting a ready block adds a copy with new, valid ids, as one undoable step', () => {
    render(<AddPanel />);
    openBlocks();
    fireEvent.click(screen.getByRole('button', { name: 'Inserir Hero' }));
    const action = lastSetData();
    expect(action.recordHistory).toBe(true);
    const content = action.data({ content: page() }).content;
    expect(content).toHaveLength(2);
    const doc = { schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content } as unknown as PageDocumentV2;
    expect(pageDraftV2Schema.safeParse(doc).success).toBe(true);
    const original = new Set<string>();
    walkElements([READY_BLOCKS[0].element], (e) => void original.add(idOf(e)));
    walkElements([content[1]], (e) => expect(original.has(idOf(e))).toBe(false));
  });

  it('lists my blocks with name and date; inserting copies them', () => {
    const element = el('section', U(50), { items: [el('divider', U(51))] });
    blocks.list = { data: [{ id: 'b1', name: 'FAQ padrão', element, createdAt: '2026-11-05T14:32:00Z' }], isPending: false, isError: false };
    render(<AddPanel />);
    openBlocks();
    const mine = screen.getByRole('button', { name: 'Inserir FAQ padrão' });
    expect(mine.textContent).toContain('2026');
    fireEvent.click(mine);
    const content = lastSetData().data({ content: page() }).content;
    expect(content).toHaveLength(2);
    expect(idOf(content[1])).not.toBe(U(50));
  });

  it('a section block with a column selected goes after the top-level section, and is selected', () => {
    setPage(page(), U(4));
    render(<AddPanel />);
    openBlocks();
    const hero = screen.getByRole('button', { name: 'Inserir Hero' }) as HTMLButtonElement;
    expect(hero.disabled).toBe(false);
    fireEvent.click(hero);
    expect(lastSetData().data({ content: page() }).content.map((c) => c.type)).toEqual(['section', 'section']);
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 1, zone: 'root:default-zone' } } });
  });

  it('a column block goes inside the closest columns that accepts it', () => {
    const column = el('column', U(60), { items: [] });
    blocks.list = { data: [{ id: 'b2', name: 'Coluna', element: column, createdAt: '2026-11-05T14:32:00Z' }], isPending: false, isError: false };
    setPage(page(), U(2)); // a heading: no ancestor is a columns, so a column fits nowhere
    const { unmount } = render(<AddPanel />);
    openBlocks();
    expect((screen.getByRole('button', { name: 'Inserir Coluna' }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    setPage(page(), U(4)); // a column: the column goes right after it, in the columns
    render(<AddPanel />);
    openBlocks();
    fireEvent.click(screen.getByRole('button', { name: 'Inserir Coluna' }));
    const columns = (lastSetData().data({ content: page() }).content[0].props as { items: PageElement[] }).items[1];
    expect((columns.props as { items: PageElement[] }).items.map((c) => c.type)).toEqual(['column', 'column', 'column']);
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 1, zone: `${U(3)}:items` } } });
  });

  it('empty page: opens on Blocos with the opening call to action', () => {
    setPage([]);
    render(<AddPanel />);
    expect(screen.getByText('Comece por um bloco pronto')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inserir “Abertura”' }));
    expect(lastSetData().data({ content: [] }).content).toHaveLength(1);
  });

  it('empty page: "Seção vazia" inserts an empty section', () => {
    setPage([]);
    render(<AddPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Seção vazia' }));
    const [section] = lastSetData().data({ content: [] }).content;
    expect(section.type).toBe('section');
    expect(idOf(section)).not.toBe('empty-section');
  });
});

describe('SaveAsBlock', () => {
  function Trigger({ element }: { element: PageElement }) {
    const open = useSaveAsBlock();
    return <button type="button" onClick={() => open(element)}>abrir</button>;
  }

  it('sends the name and the element with contract ids, showing type and element count', () => {
    const puckSection = el('section', `section-${U(7)}`, { items: [el('heading', `heading-${U(8)}`, { text: 'Olá', tag: 'h2' })] });
    render(<SaveAsBlockProvider><Trigger element={puckSection} /></SaveAsBlockProvider>);
    fireEvent.click(screen.getByText('abrir'));
    expect(screen.getByText('Seção · 2 elementos')).toBeTruthy();
    expect(screen.getByText(/Cada uso é uma cópia/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Nome do bloco/), { target: { value: 'FAQ padrão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar bloco' }));
    expect(blocks.mutate).toHaveBeenCalledTimes(1);
    const [body] = blocks.mutate.mock.calls[0];
    expect(body.name).toBe('FAQ padrão');
    expect(idOf(body.element)).toBe(U(7));
  });

  it.each([
    [403, { message: 'Forbidden' }, 'Você não tem permissão para gerenciar blocos.'],
    [400, { message: 'Bloco inválido', details: [{ path: 'element.props.text', message: 'Obrigatório.' }] }, 'element.props.text: Obrigatório.'],
    [400, { message: 'Nome já usado' }, 'Nome já usado'],
    [500, { message: 'x' }, 'Não foi possível salvar o bloco. Tente de novo.'],
  ])('shows the API error (%s)', (status, error, expected) => {
    blocks.error = { status, ...error };
    render(<SaveAsBlockProvider><Trigger element={page()[0]} /></SaveAsBlockProvider>);
    fireEvent.click(screen.getByText('abrir'));
    expect(screen.getByRole('alert').textContent).toBe(expected);
  });

  it('does not submit without a name', () => {
    render(<SaveAsBlockProvider><Trigger element={page()[0]} /></SaveAsBlockProvider>);
    fireEvent.click(screen.getByText('abrir'));
    expect((screen.getByRole('button', { name: 'Salvar bloco' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('LayersPanel', () => {
  it('shows the tree, the T mark and selects on click', () => {
    render(<LayersPanel />);
    const rows = screen.getAllByRole('treeitem');
    expect(rows).toHaveLength(5);
    const columns = rows[2];
    expect(within(columns).getByText('T')).toBeTruthy();
    fireEvent.click(within(rows[1]).getByRole('button', { name: /Título · Olá/ }));
    expect(puck.store.getSelectorForId).toHaveBeenCalledWith(U(2));
    expect(puck.store.dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 0, zone: 'root:default-zone' } } });
  });

  it('collapses a parent', () => {
    render(<LayersPanel />);
    fireEvent.click(within(screen.getAllByRole('treeitem')[0]).getByRole('button', { name: 'Recolher' }));
    expect(screen.getAllByRole('treeitem')).toHaveLength(1);
  });

  it('propagates a validation error from a nested element to its section', () => {
    setPage([el('section', U(1), { items: [el('heading', U(2), { text: '', tag: 'h2' })] })]);
    render(<LayersPanel />);
    const [section, heading] = screen.getAllByRole('treeitem');
    expect(heading.getAttribute('data-error')).toBe('true');
    expect(section.getAttribute('data-error')).toBe('true');
  });

  it('a valid tree has no error bar', () => {
    render(<LayersPanel />);
    screen.getAllByRole('treeitem').forEach((row) => expect(row.getAttribute('data-error')).toBe('false'));
  });

  it('hides at the current breakpoint', () => {
    render(<LayersPanel />);
    fireEvent.click(within(screen.getAllByRole('treeitem')[1]).getByRole('button', { name: 'Ocultar no Desktop' }));
    const content = lastSetData().data({ content: page() }).content;
    const heading = (content[0].props as { items: PageElement[] }).items[0];
    expect((heading.props as { hidden?: unknown }).hidden).toEqual({ desktop: true });
  });

  it('moves down inside the parent through the nesting-checked move', () => {
    render(<LayersPanel />);
    fireEvent.click(within(screen.getAllByRole('treeitem')[1]).getByRole('button', { name: 'Mover para baixo' }));
    const content = lastSetData().data({ content: page() }).content;
    expect((content[0].props as { items: PageElement[] }).items.map((c) => c.type)).toEqual(['columns', 'heading']);
  });

  it('offers "save as block" only for section, columns and column', () => {
    render(<LayersPanel />);
    const rows = screen.getAllByRole('treeitem');
    expect(within(rows[0]).queryByRole('button', { name: 'Salvar como bloco' })).toBeTruthy();
    expect(within(rows[1]).queryByRole('button', { name: 'Salvar como bloco' })).toBeNull();
  });
});
