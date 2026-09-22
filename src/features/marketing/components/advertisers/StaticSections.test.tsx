import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const FORMATS = [
  { title: 'Banner horizontal', spec: '728 × 90', where: 'FEED' },
  { title: 'Banner vertical', spec: '300 × 600', where: 'FEED' },
  { title: 'Imagem 16:9', spec: 'MÍNIMO 1280 × 720', where: 'PAUSA' },
  { title: 'Vídeo 16:9', spec: 'MP4', where: 'PRE-ROLL' },
];
const POSITIONS = [
  { title: 'Feed', text: 'Na home.' },
  { title: 'Página do evento', text: 'Ao lado.' },
  { title: 'Checkout', text: 'Na compra.' },
  { title: 'Pós-compra', text: 'Confirmação.' },
  { title: 'Pre-roll', text: 'Antes do vídeo.' },
  { title: 'Pausa no player', text: 'Tela cheia.' },
];
const DESTINATIONS = [
  { title: 'Um evento da showon.io', text: 'Promova.' },
  { title: 'Link externo', text: 'Seu site.' },
];
const TARGETING_ITEMS = [
  { title: 'Posições', text: 'Escolha.' },
  { title: 'Faixa etária', text: 'De 18.' },
  { title: 'Interesses', text: 'Entretenimento.' },
  { title: 'Categorias', text: 'Tags.' },
  { title: 'Período', text: 'Início e fim.' },
  { title: 'Frequência', text: 'Limite.' },
];

const RAW: Record<string, unknown> = {
  'advertisersPage.formats.items': FORMATS,
  'advertisersPage.positions.items': POSITIONS,
  'advertisersPage.targeting.destinations': DESTINATIONS,
  'advertisersPage.targeting.items': TARGETING_ITEMS,
  'advertisersPage.pricing.conditions': ['PRÉ-PAGO', 'CARTÃO DE CRÉDITO'],
  'advertisersPage.security.tags': ['SEM APOSTAS'],
};

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const t = (key: string) => key;
    t.raw = (key: string) => RAW[`${namespace}.${key}`] ?? [];
    return t;
  },
}));

import { FormatsSection } from './FormatsSection';
import { PositionsSection } from './PositionsSection';
import { TargetingSection } from './TargetingSection';
import { PricingSection } from './PricingSection';
import { ReportsSection } from './ReportsSection';
import { SecurityTeamSection } from './SecurityTeamSection';

describe('static advertiser sections', () => {
  it('renders the 4 formats with their specs', () => {
    render(<FormatsSection />);
    FORMATS.forEach((f) => {
      expect(screen.getByText(f.title)).toBeInTheDocument();
      expect(screen.getByText(f.spec)).toBeInTheDocument();
    });
  });

  it('renders the 6 journey positions', () => {
    render(<PositionsSection />);
    POSITIONS.forEach((p) => {
      expect(screen.getByText(p.title)).toBeInTheDocument();
    });
  });

  it('renders 2 destinations and 6 targeting rows', () => {
    render(<TargetingSection />);
    DESTINATIONS.forEach((d) => expect(screen.getByText(d.title)).toBeInTheDocument());
    TARGETING_ITEMS.forEach((i) => expect(screen.getByText(i.title)).toBeInTheDocument());
  });

  it('renders CPM and CPC pricing cards', () => {
    render(<PricingSection />);
    expect(screen.getByText('cards.cpm.label')).toBeInTheDocument();
    expect(screen.getByText('cards.cpc.label')).toBeInTheDocument();
  });

  it('renders the report KPIs and the by-position table', () => {
    render(<ReportsSection />);
    expect(screen.getByText('184k')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.140')).toBeInTheDocument();
    expect(screen.getByText('positions.feed')).toBeInTheDocument();
  });

  it('renders the brand-safety tags and the team mock', () => {
    render(<SecurityTeamSection />);
    expect(screen.getByText('SEM APOSTAS')).toBeInTheDocument();
    expect(screen.getByText('Bruno Rockfest')).toBeInTheDocument();
    expect(screen.getByText('Marina Costa')).toBeInTheDocument();
  });
});
