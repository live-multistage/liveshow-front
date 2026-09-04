import { describe, it, expect, vi } from 'vitest';

const steps = [
  { title: 'Crie sua conta e sua organização', text: 'Nome, descrição e logo.' },
  { title: 'Aguarde a análise', text: 'Toda organização passa por uma análise.' },
  { title: 'Conecte sua conta de recebimento', text: 'Cadastro via Stripe.' },
  { title: 'Publique seu evento', text: 'Defina data, ingressos e câmeras.' },
];

const visual: Record<string, string> = {
  newOrg: 'NOVA ORGANIZAÇÃO',
  logo: 'Logo',
  logoHint: 'PNG ou SVG, até 2 MB',
  nameLabel: 'Nome da organização',
  nameValue: 'Liga Metropolitana de Vôlei',
  descLabel: 'Descrição',
  descValue: 'Transmissões oficiais.',
  inReview: 'EM ANÁLISE',
  reviewOrg: 'Liga Metropolitana de Vôlei',
  reviewText: 'Sua organização foi enviada.',
  approved: 'Organização aprovada',
  approvedMeta: 'noreply@showon.io · agora',
  payoutAccount: 'CONTA DE RECEBIMENTO',
  stripe: 'Stripe Connect',
  stripeHint: 'Repasse direto para a sua conta',
  connected: 'CONECTADO',
  nextPayout: 'PRÓXIMO REPASSE',
  account: 'CONTA',
  event: 'Final Estadual · Quadra Central',
  ticketDigital: 'Ingresso digital',
  ticketPhysical: 'Presencial · QR',
  publish: 'Publicar evento',
  label: 'COMO FUNCIONA',
  title: 'Do cadastro ao primeiro evento em quatro passos.',
};

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const leaf = key.split('.').pop() ?? key;
      return visual[leaf] ?? key;
    };
    t.raw = (key: string) => {
      if (key === 'howItWorks.steps') return steps;
      return undefined;
    };
    return t;
  },
}));

import { render, screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('renders the section with id "como-funciona"', () => {
    const { container } = render(<HowItWorks />);
    expect(container.querySelector('#como-funciona')).not.toBeNull();
  });

  it('renders all four step titles', () => {
    render(<HowItWorks />);
    steps.forEach((step) => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    });
  });

  it('marks the first step as active initially', () => {
    render(<HowItWorks />);
    const firstTitle = screen.getByText(steps[0].title);
    const stepEl = firstTitle.closest('[data-step]');
    expect(stepEl?.getAttribute('data-step')).toBe('0');
    expect(stepEl?.className).toMatch(/active/);
  });
});
