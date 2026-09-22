import { describe, it, expect, vi } from 'vitest';

const FAQS = [
  { q: 'Quanto custa para começar?', a: 'Não há mensalidade.' },
  { q: 'Como eu pago?', a: 'Com cartão de crédito.' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'faq.items' ? FAQS : []);
    return t;
  },
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { FaqSection } from './FaqSection';

describe('FaqSection', () => {
  it('opens the first question by default and toggles others on click', () => {
    render(<FaqSection />);

    const firstButton = screen.getByRole('button', { name: new RegExp(FAQS[0].q) });
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    const secondButton = screen.getByRole('button', { name: new RegExp(FAQS[1].q) });
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondButton);
    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('links the help CTA to the Ads Manager signup', () => {
    render(<FaqSection />);
    const link = screen.getByRole('link', { name: /faq.helpLink/ });
    expect(link.getAttribute('href')).toMatch(/\/signup$/);
  });
});
