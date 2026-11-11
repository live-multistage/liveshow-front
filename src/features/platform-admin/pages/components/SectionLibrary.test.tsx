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
import { SectionLibrary } from './SectionLibrary';

const setup = (props: Partial<React.ComponentProps<typeof SectionLibrary>> = {}) => {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(<SectionLibrary position={3} count={5} onPick={onPick} onClose={onClose} {...props} />);
  return { onPick, onClose };
};

describe('SectionLibrary', () => {
  it('lists all twelve section types with the position in the header', () => {
    setup();
    expect(screen.getByText(/POSIÇÃO 04/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Adicionar / })).toHaveLength(12);
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Eventos' }));
    expect(screen.getAllByRole('button', { name: /Adicionar / }).map((b) => b.textContent)).toEqual([
      expect.stringContaining('Trilho de eventos'), expect.stringContaining('Evento em destaque'),
    ]);
  });

  it('filters by search and shows an empty state', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar seção' }), 'pergunta');
    expect(screen.getAllByRole('button', { name: /Adicionar / })).toHaveLength(1);
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar seção' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar seção' }), 'zzzz');
    expect(screen.getByText('Nenhuma seção encontrada.')).toBeInTheDocument();
  });

  it('picks the chosen type', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    await user.click(screen.getByRole('button', { name: /Adicionar Perguntas frequentes/ }));
    expect(onPick).toHaveBeenCalledWith('faq');
  });

  it('closes on the close button and on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Fechar biblioteca' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('disables every card at the 30 section limit', () => {
    const { onPick } = setup({ count: 30 });
    expect(screen.getByText('Esta página chegou ao limite de 30 seções.')).toBeInTheDocument();
    for (const card of screen.getAllByRole('button', { name: /Adicionar / })) expect(card).toBeDisabled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
