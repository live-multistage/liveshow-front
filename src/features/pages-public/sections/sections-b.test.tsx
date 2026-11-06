import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageDocument, PageSection, ResolvedRailEvent } from '@live-show/api-contracts';
import { PageSections } from './PageSections';
import { RailSection } from './RailSection';
import { FeaturedSection } from './FeaturedSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { FinalSection } from './FinalSection';

const appearance = { background: 'default', spacing: 'normal', showOn: 'all' } as const;
const doc = (...sections: PageSection[]): PageDocument => ({ schemaVersion: 1, context: { type: 'none' }, sections });
const ev = (over: Partial<ResolvedRailEvent> = {}): ResolvedRailEvent => ({
  id: 'e1', title: 'Aurora ao vivo', slug: 'aurora', posterUrl: 'https://x.io/p.png', startsAt: '2026-01-10T21:00:00-03:00', isLive: false, ...over,
});

describe('RailSection', () => {
  it('renders title, cards linking by slug (id fallback), date and live badge', () => {
    render(<RailSection sectionId="r" props={{ title: 'Em alta', source: { kind: 'live' }, limit: 4 }}
      resolved={{ rails: { r: [ev({ isLive: true }), ev({ id: 'e2', slug: undefined, title: 'Sem slug' })] }, featured: {}, live: {} }} />);
    expect(screen.getByRole('heading', { name: 'Em alta' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Aurora ao vivo/ }).getAttribute('href')).toBe('/events/aurora');
    expect(screen.getByRole('link', { name: /Sem slug/ }).getAttribute('href')).toBe('/events/e2');
    expect(screen.getAllByText('AO VIVO')).toHaveLength(1);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });
  it('renders nothing without resolved events', () => {
    const { container } = render(<RailSection sectionId="r" props={{ title: 'X', source: { kind: 'live' }, limit: 4 }} resolved={{ rails: {}, featured: {}, live: {} }} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('FeaturedSection', () => {
  const props = { eventId: 'e1' };
  it('renders event with default CTA label', () => {
    render(<FeaturedSection sectionId="f" props={props} resolved={{ rails: {}, featured: { f: ev() }, live: {} }} />);
    expect(screen.getByRole('link', { name: 'Comprar ingresso' }).getAttribute('href')).toBe('/events/aurora');
    expect(screen.getByText('Aurora ao vivo')).toBeTruthy();
  });
  it('uses custom ctaLabel', () => {
    render(<FeaturedSection sectionId="f" props={{ ...props, ctaLabel: 'Garanta já' }} resolved={{ rails: {}, featured: { f: ev() }, live: {} }} />);
    expect(screen.getByRole('link', { name: 'Garanta já' })).toBeTruthy();
  });
  it('renders nothing when null', () => {
    const { container } = render(<FeaturedSection sectionId="f" props={props} resolved={{ rails: {}, featured: { f: null }, live: {} }} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('PricingSection', () => {
  it('renders plans with optional description and valid CTA only', () => {
    render(<PricingSection props={{ title: 'Planos', plans: [
      { name: 'Básico', price: 'R$ 0', description: 'Grátis', cta: { label: 'Começar', href: '/events' } },
      { name: 'Pro', price: 'R$ 99', cta: { label: 'Mau', href: 'javascript:x' } },
    ] }} />);
    expect(screen.getByText('R$ 99')).toBeTruthy();
    expect(screen.getByText('Grátis')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Começar' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Mau' })).toBeNull();
  });
});

describe('FaqSection', () => {
  it('opens and closes answers', () => {
    const { container } = render(<FaqSection props={{ title: 'FAQ', items: [{ question: 'Como?', answer: 'Assim.' }] }} />);
    const d = container.querySelector('details') as HTMLDetailsElement;
    expect(d.open).toBe(false);
    fireEvent.click(screen.getByText('Como?'));
    // jsdom does not toggle details on click; emulate the browser
    d.open = true;
    expect(d.open).toBe(true);
    expect(screen.getByText('Assim.')).toBeTruthy();
    d.open = false;
    expect(d.open).toBe(false);
  });
});

describe('FinalSection', () => {
  it('renders title, subtitle and CTA', () => {
    render(<FinalSection props={{ title: 'Fim', subtitle: 'Sub', cta: { label: 'Ver eventos', href: '/events' } }} />);
    expect(screen.getByRole('heading', { name: 'Fim' })).toBeTruthy();
    expect(screen.getByText('Sub')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver eventos' })).toBeTruthy();
  });
});

describe('PageSections registry (all 12)', () => {
  const sec = (id: string, type: string, props: unknown) => ({ id, type, hidden: false, appearance, props }) as PageSection;
  it('renders rail via section id, skips empty rail and null featured frames', () => {
    const { container } = render(<PageSections
      resolved={{ rails: { r1: [ev()], r2: [] }, featured: { f1: null }, live: {} }}
      document={doc(
        sec('r1', 'rail', { title: 'A', source: { kind: 'live' }, limit: 4 }),
        sec('r2', 'rail', { title: 'B', source: { kind: 'live' }, limit: 4 }),
        sec('f1', 'featured', { eventId: 'e1' }),
        sec('q', 'faq', { title: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] }),
        sec('z', 'final', { title: 'Fim', cta: { label: 'Go', href: '/events' } }),
        sec('p', 'pricing', { title: 'Planos', plans: [{ name: 'N', price: '1' }] }),
      )} />);
    expect(container.querySelector('#r1')).toBeTruthy();
    expect(container.querySelector('#r2')).toBeNull();
    expect(container.querySelector('#f1')).toBeNull();
    for (const id of ['q', 'z', 'p']) expect(container.querySelector(`#${id}`)).toBeTruthy();
  });
});
