import React, { useReducer } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
    return typeof template === 'string'
      ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? ''))
      : key;
  },
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PAGE_LIMITS, createEmptyDocument, createEmptySection, type PageSection } from '@live-show/api-contracts';
import { createEditorState, pageEditorReducer, selectInvalidSections } from '../hooks/page-editor-reducer';
import { SectionTree } from './SectionTree';

const text = (id: string, title: string): PageSection => {
  const base = createEmptySection('text', id);
  return { ...base, props: { title, paragraphs: [[{ text: 'x' }]] } } as PageSection;
};

function Harness({ sections, onAdd = vi.fn() }: { sections: PageSection[]; onAdd?: () => void }) {
  const [state, dispatch] = useReducer(pageEditorReducer, { ...createEmptyDocument(), sections }, createEditorState);
  return (
    <DndProvider backend={HTML5Backend}>
      <SectionTree
        sections={state.document.sections}
        selectedId={state.selectedId}
        issues={selectInvalidSections(state.document)}
        locked={state.locked}
        dispatch={dispatch}
        onAdd={onAdd}
      />
    </DndProvider>
  );
}

const rows = () => screen.getAllByTestId('section-row');
const order = () => rows().map((r) => within(r).getByTestId('section-summary').textContent);

describe('SectionTree', () => {
  const three = () => [text('a', 'Alpha'), text('b', 'Beta'), text('c', 'Gama')];

  it('selects a section (aria-pressed)', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    await user.click(within(rows()[1]).getByRole('button', { name: /Beta/ }));
    expect(within(rows()[1]).getByRole('button', { name: /Beta/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rows()[0]).getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides and shows a section', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    await user.click(within(rows()[0]).getByRole('button', { name: 'Ocultar seção Texto' }));
    expect(within(rows()[0]).getByTestId('section-summary')).toHaveTextContent('Oculta · Alpha');
    expect(screen.getByText('1 OCULTA')).toBeInTheDocument();
    await user.click(within(rows()[0]).getByRole('button', { name: 'Mostrar seção Texto' }));
    expect(order()).toEqual(['Alpha', 'Beta', 'Gama']);
  });

  it('reorders with the up/down buttons and disables them at the edges', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    expect(within(rows()[0]).getByRole('button', { name: /para cima/ })).toBeDisabled();
    expect(within(rows()[2]).getByRole('button', { name: /para baixo/ })).toBeDisabled();
    await user.click(within(rows()[2]).getByRole('button', { name: /para cima/ }));
    expect(order()).toEqual(['Alpha', 'Gama', 'Beta']);
  });

  it('reorders with Alt+Arrow on the focused row', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    within(rows()[0]).getByRole('button', { name: /Alpha/ }).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(order()).toEqual(['Beta', 'Alpha', 'Gama']);
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(order()).toEqual(['Alpha', 'Beta', 'Gama']);
  });

  it('duplicates right after the original and selects the copy', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    await user.click(within(rows()[0]).getByRole('button', { name: /Duplicar/ }));
    expect(order()).toEqual(['Alpha', 'Alpha', 'Beta', 'Gama']);
    expect(within(rows()[1]).getByRole('button', { name: /Alpha/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4/30')).toBeInTheDocument();
  });

  it('shows the empty state and calls onAdd', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<Harness sections={[]} onAdd={onAdd} />);
    expect(screen.getByText('Nenhuma seção ainda.')).toBeInTheDocument();
    expect(screen.getByText('0/30')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar seção' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('disables add at the section limit', () => {
    const many = Array.from({ length: PAGE_LIMITS.maxSections }, (_, i) => text(`s${i}`, `T${i}`));
    render(<Harness sections={many} />);
    expect(screen.getByRole('button', { name: 'Adicionar seção' })).toBeDisabled();
  }, 30_000);

  it('flags sections with validation issues', () => {
    render(<Harness sections={[createEmptySection('hero', 'h'), text('b', 'Beta')]} />);
    const invalid = rows().map((r) => within(r).getAllByRole('button')[0].getAttribute('aria-invalid'));
    expect(invalid).toEqual(['true', null]);
  });

  it('disables every edit while locked (conflict)', async () => {
    function Locked() {
      const [state, dispatch] = useReducer(pageEditorReducer, { ...createEmptyDocument(), sections: three() }, createEditorState);
      return (
        <DndProvider backend={HTML5Backend}>
          <SectionTree sections={state.document.sections} selectedId={null} issues={{}} locked dispatch={dispatch} onAdd={vi.fn()} />
        </DndProvider>
      );
    }
    render(<Locked />);
    expect(screen.getByRole('button', { name: 'Adicionar seção' })).toBeDisabled();
    expect(within(rows()[0]).getByRole('button', { name: /Ocultar/ })).toBeDisabled();
    expect(within(rows()[0]).getByRole('button', { name: /Remover/ })).toBeDisabled();
  });

  it('keeps focus on the moved row after Alt+ArrowDown and ignores Alt moves at the edges', async () => {
    const user = userEvent.setup();
    render(<Harness sections={three()} />);
    const select = (i: number) => within(rows()[i]).getByRole('button', { name: /Alpha|Beta|Gama/ });
    select(0).focus();
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(order()).toEqual(['Alpha', 'Beta', 'Gama']);
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(order()).toEqual(['Beta', 'Alpha', 'Gama']);
    expect(select(1)).toHaveFocus();
    select(2).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await user.click(screen.getByRole('button', { name: /Adicionar seção/ }));
    expect(screen.getByRole('button', { name: /Adicionar seção/ })).toHaveFocus();
  });
});
