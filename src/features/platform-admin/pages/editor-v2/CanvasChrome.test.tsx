import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const puck = vi.hoisted(() => ({
  store: {
    dispatch: vi.fn(),
    selectedItem: null as unknown,
    getSelectorForId: vi.fn((id: string) => ({ index: 0, zone: `sel:${id}` })),
    getParentById: vi.fn((): unknown => null),
    appState: { data: { root: { props: {} }, content: [] as unknown[] } },
  },
}));
vi.mock('@puckeditor/core', () => ({ createUsePuck: () => (selector: (s: typeof puck.store) => unknown) => selector(puck.store) }));

import { fireEvent, render, screen } from '@testing-library/react';
import type { PageElement } from '@live-show/api-contracts';
import { CanvasCrumbs } from './CanvasCrumbs';
import { CanvasEmpty } from './CanvasEmpty';
import { CanvasStage, canvasSizeLabel } from './CanvasStage';
import { idOf } from './left/tree-ops';
import { useEscapeClimb } from './use-escape-climb';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const el = (type: string, id: string, props: object = {}) => ({ type, props: { id, ...props } }) as unknown as PageElement;
const page = (): PageElement[] => [
  el('section', U(1), { items: [el('columns', U(2), { items: [el('column', U(3), { items: [el('heading', U(4), { text: 'Olá', tag: 'h2' })] })] })] }),
];
const lastItemSelector = () => puck.store.dispatch.mock.calls.map(([a]) => a).filter((a) => a.type === 'setUi').at(-1)?.ui.itemSelector;

beforeEach(() => {
  puck.store.dispatch.mockClear();
  puck.store.appState.data.content = page();
  puck.store.selectedItem = { props: { id: U(4) } };
});

describe('canvas size label', () => {
  it('names the device and the real width, and the scale only when shrunk', () => {
    expect(canvasSizeLabel('Desktop', 1280, 1)).toBe('DESKTOP · 1280PX');
    expect(canvasSizeLabel('Desktop', 1280, 0.6)).toBe('DESKTOP · 1280PX · 60%');
  });
  it('is shown in the bar next to the trail', () => {
    render(<CanvasStage width={390} breakpoint="mobile" deviceLabel="Celular" crumbs={<CanvasCrumbs />}><p>page</p></CanvasStage>);
    expect(screen.getByTestId('canvas-size')).toHaveTextContent('CELULAR · 390PX');
    expect(screen.getByText('page').parentElement).toHaveAttribute('data-device', 'mobile');
  });
});

describe('selection trail', () => {
  it('shows PÁGINA › SEÇÃO › COLUNAS › COLUNA › TÍTULO for the selected heading', () => {
    render(<CanvasCrumbs />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['PÁGINA', 'SEÇÃO', 'COLUNAS', 'COLUNA', 'TÍTULO']);
    expect(screen.getByRole('button', { name: 'TÍTULO' })).toHaveAttribute('aria-current', 'true');
  });

  it('clicking an ancestor selects it', () => {
    render(<CanvasCrumbs />);
    fireEvent.click(screen.getByRole('button', { name: 'COLUNAS' }));
    expect(puck.store.getSelectorForId).toHaveBeenCalledWith(U(2));
    expect(lastItemSelector()).toEqual({ index: 0, zone: `sel:${U(2)}` });
  });

  it('PÁGINA clears the selection; with nothing selected the trail is only PÁGINA', () => {
    const { rerender } = render(<CanvasCrumbs />);
    fireEvent.click(screen.getByRole('button', { name: 'PÁGINA' }));
    expect(lastItemSelector()).toBeNull();
    puck.store.selectedItem = null;
    rerender(<CanvasCrumbs />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['PÁGINA']);
  });
});

describe('empty page on the canvas', () => {
  beforeEach(() => { puck.store.appState.data.content = []; puck.store.selectedItem = null; });
  const inserted = () => {
    const call = puck.store.dispatch.mock.calls.map(([a]) => a).find((a) => a.type === 'setData');
    return (call.data({ content: [] }).content as PageElement[]);
  };

  it('"Seção vazia" inserts an empty section, as the panel does', () => {
    render(<CanvasEmpty />);
    fireEvent.click(screen.getByRole('button', { name: 'Seção vazia' }));
    const [section] = inserted();
    expect(section.type).toBe('section');
    expect(idOf(section)).not.toBe('empty-section');
  });

  it('"Inserir “Abertura”" inserts the opening block', () => {
    render(<CanvasEmpty />);
    fireEvent.click(screen.getByRole('button', { name: 'Inserir “Abertura”' }));
    expect(inserted()[0].type).toBe('section');
    expect(inserted()[0].props).toHaveProperty('items');
  });
});

describe('Esc', () => {
  const Probe = () => { useEscapeClimb(); return <input aria-label="campo" />; };
  const press = (target: Element | Document = document.body) => fireEvent.keyDown(target, { key: 'Escape' });

  it('climbs the selection to the parent', () => {
    puck.store.getParentById.mockReturnValue({ type: 'column', props: { id: U(3) } });
    render(<Probe />);
    press();
    expect(lastItemSelector()).toEqual({ index: 0, zone: `sel:${U(3)}` });
  });

  it('from a top-level element (Puck answers the page root) it clears the selection', () => {
    puck.store.getParentById.mockReturnValue({ type: 'root', props: {} });
    render(<Probe />);
    press();
    expect(lastItemSelector()).toBeNull();
  });

  it('does nothing without a selection', () => {
    puck.store.selectedItem = null;
    render(<Probe />);
    press();
    expect(puck.store.dispatch).not.toHaveBeenCalled();
  });

  it('leaves a dialog to close itself: the selection stays', () => {
    puck.store.getParentById.mockReturnValue({ type: 'column', props: { id: U(3) } });
    render(<><Probe /><div role="dialog" /></>);
    press();
    expect(puck.store.dispatch).not.toHaveBeenCalled();
  });

  it('typing in a field, the first Esc leaves the field and the selection stays', () => {
    puck.store.getParentById.mockReturnValue({ type: 'column', props: { id: U(3) } });
    render(<Probe />);
    const field = screen.getByLabelText('campo');
    field.focus();
    press(field);
    expect(field).not.toHaveFocus();
    expect(puck.store.dispatch).not.toHaveBeenCalled();
  });
});
