import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PageDocument, PageSection } from '@live-show/api-contracts';
import { PageSections } from './PageSections';
import { TextSection } from './TextSection';
import { HeroSection } from './HeroSection';
import { AudienceSection } from './AudienceSection';
import { FeaturesSection } from './FeaturesSection';
import { HowSection } from './HowSection';
import { MediaSection } from './MediaSection';
import { StatsSection } from './StatsSection';

const resolved = { rails: {}, featured: {}, live: {} };
const appearance = { background: 'default', spacing: 'normal', showOn: 'all' } as const;
const doc = (...sections: PageSection[]): PageDocument => ({ schemaVersion: 1, context: { type: 'none' }, sections });

describe('HeroSection', () => {
  it('renders texts and valid CTAs; external opens safely', () => {
    render(<HeroSection props={{ eyebrow: 'NOVO', title: 'Título', subtitle: 'Sub', primaryCta: { label: 'Ver eventos', href: '/events' }, secondaryCta: { label: 'Site', href: 'https://x.io' } }} />);
    expect(screen.getByRole('heading', { name: 'Título' })).toBeTruthy();
    expect(screen.getByText('NOVO')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver eventos' }).getAttribute('target')).toBeNull();
    const ext = screen.getByRole('link', { name: 'Site' });
    expect(ext.getAttribute('target')).toBe('_blank');
    expect(ext.getAttribute('rel')).toBe('noopener noreferrer');
  });
  it('omits optional elements and invalid hrefs', () => {
    const { container } = render(<HeroSection props={{ title: 'T', primaryCta: { label: 'Mau', href: 'javascript:alert(1)' } }} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('AudienceSection', () => {
  it('renders text and counters, none when empty', () => {
    const { container, rerender } = render(<AudienceSection props={{ text: 'Para você', counters: [{ value: '10k', label: 'FÃS' }] }} />);
    expect(screen.getByText('10k')).toBeTruthy();
    rerender(<AudienceSection props={{ text: 'Para você', counters: [] }} />);
    expect(container.querySelectorAll('b')).toHaveLength(0);
  });
});

describe('TextSection', () => {
  it('renders bold, italic and valid links; invalid href stays plain text', () => {
    const { container } = render(<TextSection props={{ paragraphs: [[
      { text: 'a', bold: true }, { text: 'b', italic: true }, { text: 'ok', href: '/p/x' }, { text: 'bad', href: 'javascript:x' },
    ]] }} />);
    expect(container.querySelector('strong')?.textContent).toBe('a');
    expect(container.querySelector('em')?.textContent).toBe('b');
    expect(screen.getByRole('link', { name: 'ok' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
    expect(screen.getByText('bad')).toBeTruthy();
    expect(container.querySelector('h2')).toBeNull();
  });
});

describe('FeaturesSection / HowSection / StatsSection', () => {
  it('features', () => {
    render(<FeaturesSection props={{ title: 'Recursos', items: [{ title: 'A', text: 'a1' }] }} />);
    expect(screen.getByText('Recursos')).toBeTruthy();
    expect(screen.getByText('a1')).toBeTruthy();
  });
  it('how numbers steps and hides missing eyebrow', () => {
    const { container } = render(<HowSection props={{ title: 'Como', steps: [{ title: 'S1', text: 't1' }, { title: 'S2', text: 't2' }] }} />);
    expect(screen.getByText('02')).toBeTruthy();
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });
  it('stats', () => {
    const { container } = render(<StatsSection props={{ items: [{ value: '99%', label: 'ok' }] }} />);
    expect(screen.getByText('99%')).toBeTruthy();
    expect(container.querySelector('h2')).toBeNull();
  });
});

describe('MediaSection', () => {
  it('image with caption', () => {
    render(<MediaSection props={{ kind: 'image', url: 'https://x.io/a.png', alt: 'Alt', caption: 'Legenda' }} />);
    expect(screen.getByAltText('Alt')).toBeTruthy();
    expect(screen.getByText('Legenda')).toBeTruthy();
  });
  it('video has controls and no caption element when absent', () => {
    const { container } = render(<MediaSection props={{ kind: 'video', url: 'https://x.io/a.mp4', alt: 'V' }} />);
    expect(container.querySelector('video')?.hasAttribute('controls')).toBe(true);
    expect(container.querySelector('figcaption')).toBeNull();
  });
});

describe('PageSections', () => {
  const mk = (id: string, extra: Partial<PageSection> = {}) =>
    ({ id, type: 'stats', hidden: false, appearance, props: { items: [{ value: id, label: 'l' }] }, ...extra }) as PageSection;

  it('skips hidden sections and rails with no events; sets anchor id', () => {
    const rail = { id: 'r', type: 'rail', hidden: false, appearance, props: { title: 'R', source: { kind: 'live' }, limit: 4 } } as PageSection;
    const { container } = render(<PageSections resolved={resolved} document={doc(mk('s1'), mk('s2', { hidden: true }), rail)} />);
    expect(container.querySelector('#s1')).toBeTruthy();
    expect(container.querySelector('#s2')).toBeNull();
    expect(container.querySelector('#r')).toBeNull();
  });
  it('applies showOn class', () => {
    const { container } = render(<PageSections resolved={resolved} document={doc(mk('s1', { appearance: { ...appearance, showOn: 'mobile' } }))} />);
    expect(container.querySelector('#s1')?.className).toMatch(/show_mobile/);
  });
});
