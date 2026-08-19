import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { NotFoundContent } from './NotFoundContent';

describe('NotFoundContent', () => {
  /**
   * Um 404 sem saída é um beco. Estes três destinos são a razão de a página
   * existir; se algum sumir, o usuário fica preso.
   */
  it('offers a way out to home, schedule and the access list', () => {
    render(<NotFoundContent />);

    expect(screen.getByRole('link', { name: /goHome/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /seeSchedule/ })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: 'ticketHelpLink' })).toHaveAttribute('href', '/my-list');
  });

  it('announces itself with a single top-level heading', () => {
    render(<NotFoundContent />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('title');
  });

  /**
   * O equalizador é enfeite. Se ele entrar na árvore de acessibilidade, um
   * leitor de tela anuncia cinco elementos vazios antes do conteúdo real.
   */
  it('keeps the decorative animation out of the accessibility tree', () => {
    const { container } = render(<NotFoundContent />);

    const decorations = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorations.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
