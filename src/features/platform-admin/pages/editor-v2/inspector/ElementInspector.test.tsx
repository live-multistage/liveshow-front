import React, { useEffect } from 'react';
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
    return typeof template === 'string' ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? '')) : `${namespace}.${key}`;
  },
}));

const uploadMutate = vi.hoisted(() => vi.fn());
vi.mock('../../mutations/use-page-mutations', () => ({
  useUploadPageAssetMutation: () => ({ mutateAsync: uploadMutate, isPending: false }),
}));
vi.mock('../../../mailing/components/EventPicker', () => ({ EventPicker: () => <div data-testid="event-picker" /> }));
vi.mock('../../../mailing/components/ArtistPicker', () => ({ ArtistPicker: () => null }));
vi.mock('../../../mailing/components/OrganizationPicker', () => ({ OrganizationPicker: () => null }));

// Puck is replaced by the slice of its store the inspector reads: selection, selectors, data and dispatch.
const puck = vi.hoisted(() => ({
  store: {} as Record<string, any>,
}));
vi.mock('@puckeditor/core', () => ({
  createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import type { ElementType, PageDocumentV2 } from '@live-show/api-contracts';
import { toPuckData } from '../puck-data';
import { BreakpointProvider, useBreakpointSetter } from '../use-breakpoint';
import { ElementInspector } from './ElementInspector';
import { ServerIssuesProvider } from './element-issues';

const SECTION = '99999999-9999-4999-8999-999999999999';
const ELEMENT = '11111111-1111-4111-8111-111111111111';
const PUCK_ID = `heading-${ELEMENT}`;

function select(type: ElementType, props: Record<string, unknown>) {
  const doc = {
    schemaVersion: 2, context: { type: 'none' }, root: { props: {} },
    content: [{ type: 'section', props: { id: SECTION, items: [{ type, props: { id: PUCK_ID, ...props } }] } }],
  } as unknown as PageDocumentV2;
  const dispatch = vi.fn();
  const section = { type: 'section', props: { id: SECTION } };
  puck.store = {
    dispatch,
    selectedItem: { type, props: { id: PUCK_ID, ...props } },
    appState: { data: toPuckData(doc) },
    getSelectorForId: (id: string) => (id === PUCK_ID ? { index: 0, zone: `${SECTION}:items` } : { index: 0, zone: 'root:default-zone' }),
    getParentById: () => section,
  };
  return dispatch;
}

function SetBreakpoint({ bp }: { bp: 'desktop' | 'tablet' | 'mobile' }) {
  const set = useBreakpointSetter();
  useEffect(() => set(bp), [bp, set]);
  return null;
}

function renderInspector(bp: 'desktop' | 'tablet' | 'mobile' = 'desktop', serverIssues = {}) {
  return render(
    <BreakpointProvider>
      <SetBreakpoint bp={bp} />
      <ServerIssuesProvider value={serverIssues}><ElementInspector /></ServerIssuesProvider>
    </BreakpointProvider>,
  );
}

const replaced = (dispatch: ReturnType<typeof vi.fn>) => dispatch.mock.calls.map(([a]) => a).filter((a) => a.type === 'replace').at(-1);

beforeEach(() => uploadMutate.mockReset());

describe('ElementInspector: structure', () => {
  it('shows the empty state without a selection', () => {
    puck.store = { selectedItem: null };
    renderInspector();
    expect(screen.getByTestId('inspector-empty')).toBeInTheDocument();
  });

  it('names the element and its parent, with the three tabs', () => {
    select('heading', { text: 'Oi', tag: 'h2' });
    renderInspector();
    expect(screen.getByText('Título')).toBeInTheDocument();
    expect(screen.getByText('dentro de Seção')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Conteúdo']);
  });

  it('selects the parent, duplicates and deletes through the Puck store', () => {
    const dispatch = select('heading', { text: 'Oi', tag: 'h2' });
    renderInspector();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar o elemento pai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'setUi', ui: { itemSelector: { index: 0, zone: 'root:default-zone' } } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'duplicate', sourceIndex: 0, sourceZone: `${SECTION}:items` });
    expect(dispatch).toHaveBeenCalledWith({ type: 'remove', index: 0, zone: `${SECTION}:items` });
  });
});

describe('ElementInspector: content', () => {
  it('editing the text dispatches a replace with the new props', () => {
    const dispatch = select('heading', { text: 'Oi', tag: 'h2' });
    renderInspector();
    fireEvent.change(screen.getByLabelText(/^Texto/), { target: { value: 'Olá' } });
    expect(replaced(dispatch)).toEqual({
      type: 'replace', destinationIndex: 0, destinationZone: `${SECTION}:items`,
      data: { type: 'heading', props: { id: PUCK_ID, text: 'Olá', tag: 'h2' } },
    });
  });

  it('an invalid button link shows the contract error', () => {
    select('button', { label: 'Ir', href: 'javascript:alert(1)' });
    renderInspector();
    expect(screen.getByText('Use um link https://, /caminho ou #âncora.')).toBeInTheDocument();
  });

  it('shows the error pill with the count of the element issues', () => {
    select('button', { label: '', href: 'javascript:alert(1)' });
    renderInspector();
    expect(screen.getByRole('status')).toHaveTextContent('2 ERROS');
  });

  it('no pill on a valid element', () => {
    select('heading', { text: 'Oi', tag: 'h2' });
    renderInspector();
    expect(screen.queryByText(/ERRO/)).not.toBeInTheDocument();
  });

  it('a video host that is not allowed shows the contract message', () => {
    select('video', { url: 'https://evil.example/v/1' });
    renderInspector();
    expect(screen.getByText('Use um vídeo do YouTube, do Vimeo ou da biblioteca da plataforma.')).toBeInTheDocument();
  });

  it('an upload that breaks the asset limits never reaches the service', () => {
    select('image', { url: '', alt: '' });
    const { container } = renderInspector();
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(uploadMutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('a valid upload writes the returned url', async () => {
    uploadMutate.mockResolvedValue({ url: 'https://cdn.example/a.png' });
    const dispatch = select('image', { url: '', alt: 'Capa' });
    const { container } = renderInspector();
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
        await vi.waitFor(() => expect(replaced(dispatch)?.data.props.url).toBe('https://cdn.example/a.png'));
  });

  it('a faq item edit keeps the other questions', () => {
    const dispatch = select('faq', { items: [{ question: 'A?', answer: 'a' }, { question: 'B?', answer: 'b' }] });
    renderInspector();
    fireEvent.change(screen.getAllByLabelText(/^Pergunta\b/)[1]!, { target: { value: 'C?' } });
    expect(replaced(dispatch)?.data.props.items).toEqual([{ question: 'A?', answer: 'a' }, { question: 'C?', answer: 'b' }]);
  });

  it('the server FEATURED_UNAVAILABLE marks the element', () => {
    select('featuredEvent', { eventId: '33333333-3333-4333-8333-333333333333' });
    renderInspector('desktop', { [ELEMENT]: { eventId: 'Evento indisponível' } });
    expect(screen.getAllByText('Evento indisponível').length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('1 ERRO');
  });
});
