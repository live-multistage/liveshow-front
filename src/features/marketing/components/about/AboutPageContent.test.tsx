import { describe, it, expect, vi } from 'vitest';

const MANIFESTO = ['Parágrafo um.', 'Parágrafo dois.', 'Parágrafo três.'];

const HOW_STEPS = [
  { title: 'Compre o ingresso.', text: 'Texto 1.' },
  { title: 'Assista com controle.', text: 'Texto 2.' },
  { title: 'Reveja quando quiser.', text: 'Texto 3.' },
];

const SIGNALS = [
  { name: 'CAM 1 · OBS' },
  { name: 'CAM 2 · vMix' },
  { name: 'CAM 3 · PTZ' },
  { name: 'LIBRAS · OBS' },
];

const HERO_MOCK_CAMS = [
  { name: 'Cam A', meta: 'WIDE · 1080p' },
  { name: 'Cam B', meta: 'TRIPÉ · 1080p' },
  { name: 'Cam C', meta: 'PTZ · 720p' },
  { name: 'Cam D', meta: 'GIMBAL · 1080p' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => {
      if (key === 'hero.manifesto') return MANIFESTO;
      if (key === 'how.steps') return HOW_STEPS;
      if (key === 'transmission.signals') return SIGNALS;
      if (key === 'hero.mock.cams') return HERO_MOCK_CAMS;
      return [];
    };
    return t;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('./ProofSection', () => ({
  ProofSection: () => <section data-testid="proof" />,
}));

import { render, screen } from '@testing-library/react';
import { AboutPageContent } from './AboutPageContent';

describe('AboutPageContent', () => {
  it('renders the three manifesto paragraphs', async () => {
    render(await AboutPageContent());
    MANIFESTO.forEach((paragraph) => {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    });
  });

  it('renders the four diferenciais titles', async () => {
    render(await AboutPageContent());
    expect(screen.getByText('diff.items.multicam.title')).toBeInTheDocument();
    expect(screen.getByText('diff.items.latency.title')).toBeInTheDocument();
    expect(screen.getByText('diff.items.replay.title')).toBeInTheDocument();
    expect(screen.getByText('diff.items.tickets.title')).toBeInTheDocument();
  });

  it('renders the six audience card titles', async () => {
    render(await AboutPageContent());
    ['shows', 'sports', 'talks', 'worship', 'theater', 'classes'].forEach((key) => {
      expect(screen.getByText(`audiences.items.${key}.title`)).toBeInTheDocument();
    });
  });

  it('renders the three "como funciona" step cards', async () => {
    render(await AboutPageContent());
    HOW_STEPS.forEach((step) => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    });
  });

  it('links to /events, /help, /privacidade, mailto and /be-partner', async () => {
    render(await AboutPageContent());
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toContain('/events');
    expect(links).toContain('/help');
    expect(links).toContain('/privacidade');
    expect(links).toContain('/be-partner');
    expect(links.some((href) => href?.startsWith('mailto:'))).toBe(true);
  });

  it('renders the ProofSection', async () => {
    render(await AboutPageContent());
    expect(screen.getByTestId('proof')).toBeInTheDocument();
  });
});
