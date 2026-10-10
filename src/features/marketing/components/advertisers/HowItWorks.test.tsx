import { describe, it, expect, vi } from 'vitest';

const STEPS = [
  { title: 'Crie sua conta', text: 'Cadastre-se.' },
  { title: 'Carregue saldo', text: 'Pré-pago.' },
  { title: 'Monte a campanha', text: 'Destino, formato.' },
  { title: 'Revisão', text: 'Nossa equipe revisa.' },
  { title: 'No ar e medindo', text: 'Acompanhe.' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'howItWorks.steps' ? STEPS : undefined);
    return t;
  },
}));

import { render, screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';

describe('advertisers HowItWorks', () => {
  it('renders all five step titles in both the compact list and the sticky grid (CSS picks one)', () => {
    render(<HowItWorks />);
    STEPS.forEach((step) => {
      expect(screen.getAllByText(step.title)).toHaveLength(2);
    });
  });

  it('marks the first step as active initially', () => {
    render(<HowItWorks />);
    const stepEl = screen
      .getAllByText(STEPS[0].title)
      .map((el) => el.closest('[data-step]'))
      .find(Boolean);
    expect(stepEl?.getAttribute('data-step')).toBe('0');
    expect(stepEl?.className).toMatch(/active/);
  });
});
