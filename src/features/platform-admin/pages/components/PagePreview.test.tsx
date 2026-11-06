import React from 'react';
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
    return typeof template === 'string' ? template.replace(/\{(\w+)\}/g, (_, n) => String(values?.[n] ?? '')) : key;
  },
}));

import { render, screen } from '@testing-library/react';
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
  render(
    <PagePreview document={document} resolved={resolved} selectedId={null} device="desktop" locked={false}
      onSelect={onSelect} onInsert={onInsert} {...props} />,
  );
  return { onSelect, onInsert };
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
});
