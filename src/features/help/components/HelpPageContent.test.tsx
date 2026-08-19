import { describe, it, expect, vi } from 'vitest';

// Devolve a chave, exceto para as perguntas/respostas — ali o texto importa
// porque a busca opera sobre ele.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const copy: Record<string, string> = {
      'faq.findEvent.q': 'Onde encontro meu evento?',
      'faq.findEvent.a': 'Em Minha lista.',
      'faq.refund.q': 'Como peço reembolso?',
      'faq.refund.a': 'Fale com o suporte.',
    };
    return copy[key] ?? key;
  },
}));
vi.mock('@live-show/design-system', () => ({
  Chip: ({ children, ...props }: { children: React.ReactNode }) => <button {...props}>{children}</button>,
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { HelpPageContent } from './HelpPageContent';

describe('HelpPageContent', () => {
  it('opens the first answer so the page never starts as a wall of closed rows', () => {
    render(<HelpPageContent />);
    const first = screen.getByRole('button', { name: /Onde encontro meu evento/ });
    expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  /**
   * O desenho usa uma div clicável. Um <button> com aria-expanded é o que
   * torna o acordeão operável por teclado — este teste é o que impede alguém
   * de "simplificar" de volta para div.
   */
  it('exposes each question as a real button tied to its panel', () => {
    render(<HelpPageContent />);
    const q = screen.getByRole('button', { name: /Como peço reembolso/ });
    expect(q.tagName).toBe('BUTTON');
    expect(q).toHaveAttribute('aria-controls');
  });

  it('opens one answer at a time', () => {
    render(<HelpPageContent />);
    const first = screen.getByRole('button', { name: /Onde encontro meu evento/ });
    const other = screen.getByRole('button', { name: /Como peço reembolso/ });

    fireEvent.click(other);

    expect(other).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the open answer when its question is clicked again', () => {
    render(<HelpPageContent />);
    const first = screen.getByRole('button', { name: /Onde encontro meu evento/ });
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('filters as the user searches, matching the answer text too', () => {
    render(<HelpPageContent />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'suporte' } });

    expect(screen.getByRole('button', { name: /Como peço reembolso/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Onde encontro meu evento/ })).not.toBeInTheDocument();
  });

  it('shows an empty state instead of an unexplained blank list', () => {
    render(<HelpPageContent />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzzz' } });
    expect(screen.getByText('noResults')).toBeInTheDocument();
  });

  it('offers a support contact that opens a mail client', () => {
    render(<HelpPageContent />);
    expect(screen.getByRole('link', { name: 'ctaAction' }).getAttribute('href')).toMatch(/^mailto:/);
  });
});
