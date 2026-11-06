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

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEmptyDocument, createEmptySection, type PageSection } from '@live-show/api-contracts';
import { PagePreview } from './PagePreview';

const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const final = (n: number, title: string, hidden = false): PageSection => {
  const base = createEmptySection('final', id(n));
  return { ...base, hidden, props: { title, cta: { label: 'Ir', href: '/x' } } } as PageSection;
};
const document = { ...createEmptyDocument(), sections: [final(1, 'Primeira'), final(2, 'Segunda', true)] };
const resolved = { rails: {}, featured: {} };

const setup = (props: Partial<React.ComponentProps<typeof PagePreview>> = {}) => {
  const onSelect = vi.fn();
  const onInsert = vi.fn();
  const onMove = vi.fn();
  const onToggleHidden = vi.fn();
  render(
    <PagePreview document={document} resolved={resolved} selectedId={null} device="desktop" locked={false}
      onSelect={onSelect} onInsert={onInsert} onMove={onMove} onToggleHidden={onToggleHidden} {...props} />,
  );
  return { onSelect, onInsert, onMove, onToggleHidden };
};

describe('PagePreview', () => {
  it('renders the local document, including hidden sections dimmed with a badge', () => {
    setup();
    expect(screen.getByText('Primeira')).toBeInTheDocument();
    expect(screen.getByText('Segunda')).toBeInTheDocument();
    expect(screen.getAllByText('OCULTA · NÃO APARECE NA PÁGINA PUBLICADA')).toHaveLength(1);
  });

  it('selects a section by clicking it, without following links inside', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getAllByText('Ir', { selector: 'a' })[0]);
    expect(onSelect).toHaveBeenCalledWith(id(1));
  });

  it('marks the selected section and scrolls it into view', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    setup({ selectedId: id(2) });
    expect(screen.getByRole('button', { name: 'Selecionar seção Chamada final', current: true })).toBeInTheDocument();
    expect(scroll).toHaveBeenCalled();
  });

  it('switches to the phone frame', () => {
    setup({ device: 'mobile' });
    expect(screen.getByTestId('preview-slot')).toHaveAttribute('data-device', 'mobile');
  });

  it('inserts a section at a position', async () => {
    const user = userEvent.setup();
    const { onInsert } = setup();
    await user.click(screen.getAllByRole('button', { name: /Inserir seção antes de/ })[1]);
    expect(onInsert).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Adicionar seção no fim' }));
    expect(onInsert).toHaveBeenLastCalledWith(2);
  });

  it('shows the empty state with a first-section button', async () => {
    const user = userEvent.setup();
    const { onInsert } = setup({ document: createEmptyDocument() });
    expect(screen.getByText('Esta página ainda não tem seções')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Adicionar primeira seção' }));
    expect(onInsert).toHaveBeenCalledWith(0);
  });

  it('uses a placeholder for a rail or featured section with nothing resolved', () => {
    const rail = createEmptySection('rail', id(3)) as PageSection;
    setup({ document: { ...createEmptyDocument(), sections: [rail] } });
    expect(screen.getByText('Sem eventos para mostrar agora.')).toBeInTheDocument();
  });

  it('treats middle-click and ctrl/cmd-click like a click and keeps inner links out of the Tab order', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    const link = screen.getAllByText('Ir', { selector: 'a' })[0];
    expect(link).toHaveAttribute('tabindex', '-1');
    fireEvent(link, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await user.keyboard('{Control>}');
    await user.click(link);
    await user.keyboard('{/Control}');
    expect(onSelect).toHaveBeenCalledTimes(2);
    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(ctrl);
    expect(ctrl.defaultPrevented).toBe(true);
  });

  it('shows the floating toolbar only on the selected section and dispatches its actions', async () => {
    const user = userEvent.setup();
    const { onMove, onToggleHidden } = setup({ selectedId: id(1) });
    const toolbar = screen.getByRole('toolbar', { name: 'Barra da seção' });
    expect(screen.getAllByRole('toolbar')).toHaveLength(1);
    expect(toolbar).toHaveTextContent('Chamada final');
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Descer' }));
    expect(onMove).toHaveBeenCalledWith(id(1), 1);
    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(onToggleHidden).toHaveBeenCalledWith(id(1));
  });

  it('offers Mostrar for a hidden selected section and disables the toolbar while locked', () => {
    setup({ selectedId: id(2), locked: true });
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
  });

  describe('desktop scaling', () => {
    let resize: (width: number) => void;
    beforeEach(() => {
      vi.stubGlobal('ResizeObserver', class {
        private targets: Element[] = [];
        constructor(private cb: (entries: { target: Element; contentRect: { width: number; height: number } }[]) => void) {
          resize = (width) => this.cb(this.targets.map((target) => ({ target, contentRect: { width, height: 800 } })));
        }
        observe(el: Element) { this.targets.push(el); }
        disconnect() {}
        unobserve() {}
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('renders a 1280px desktop page scaled down to the column width', () => {
      setup();
      act(() => resize(640));
      const scaler = screen.getByTestId('preview-scaler');
      expect(scaler.style.transform).toBe('scale(0.5)');
      expect(scaler.style.width).toBe('1280px');
    });

    it('never scales up past the 1280px desktop width', () => {
      setup();
      act(() => resize(2000));
      expect(screen.getByTestId('preview-scaler').style.transform).toBe('scale(1)');
    });
  });
});
