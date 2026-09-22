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
  it('renders all five step titles', () => {
    render(<HowItWorks />);
    STEPS.forEach((step) => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    });
  });

  it('marks the first step as active initially', () => {
    render(<HowItWorks />);
    const firstTitle = screen.getByText(STEPS[0].title);
    const stepEl = firstTitle.closest('[data-step]');
    expect(stepEl?.getAttribute('data-step')).toBe('0');
    expect(stepEl?.className).toMatch(/active/);
  });
});
