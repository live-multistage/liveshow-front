import { describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';
import type { ResolvedSeoConfig } from '@live-show/api-contracts';
import { applySeo, fillPlaceholders, resolveJsonLd } from './resolve-seo';

const empty: ResolvedSeoConfig = {
  pageKey: 'events.detail', defaultOgImageUrl: null, titleTemplate: null, descriptionTemplate: null, ogImageUrl: null,
  robotsIndex: null, robotsFollow: null, disabledGeneratedJsonLd: [], extraJsonLd: [],
};
const base: Metadata = {
  title: 'Show X', description: 'desc', alternates: { canonical: 'https://showon.io/events/x' },
  openGraph: { type: 'website', title: 'Show X', description: 'desc' }, twitter: { title: 'Show X', description: 'desc' },
};

describe('fillPlaceholders', () => {
  it('replaces known vars, blanks unknown/missing, tolerates spaces', () =>
    expect(fillPlaceholders('{{ event.name }} · {{event.endsAt}} · {{x}}', { 'event.name': 'Show' })).toBe('Show ·  · '));
});

describe('applySeo', () => {
  it('returns base untouched when config is null or empty', () => {
    expect(applySeo(base, null, {})).toEqual(base);
    expect(applySeo(base, empty, {})).toEqual(base);
  });

  it('overrides title/description everywhere they appear', () => {
    const out = applySeo(base, { ...empty, titleTemplate: '{{event.name}} ao vivo', descriptionTemplate: 'Veja {{event.name}}' }, { 'event.name': 'Show X' });
    expect(out.title).toBe('Show X ao vivo');
    expect(out.openGraph).toMatchObject({ title: 'Show X ao vivo', description: 'Veja Show X', type: 'website' });
    expect(out.twitter).toMatchObject({ title: 'Show X ao vivo', description: 'Veja Show X' });
    expect(out.alternates).toEqual(base.alternates);
  });

  it('keeps an admin title absolute when the base title is absolute', () =>
    expect(applySeo({ ...base, title: { absolute: 'Home' } }, { ...empty, titleTemplate: 'Novo' }, {}).title).toEqual({ absolute: 'Novo' }));

  it('keeps the code default when a template resolves to blank', () =>
    expect(applySeo(base, { ...empty, titleTemplate: '{{event.missing}}' }, {}).title).toBe('Show X'));

  it('uses configured og image, else global default only when base has none', () => {
    expect(applySeo(base, { ...empty, ogImageUrl: 'https://cdn/a.png' }, {}).openGraph).toMatchObject({ images: [{ url: 'https://cdn/a.png' }] });
    expect(applySeo(base, { ...empty, defaultOgImageUrl: 'https://cdn/d.png' }, {}).openGraph).toMatchObject({ images: [{ url: 'https://cdn/d.png' }] });
    const withImage = { ...base, openGraph: { ...base.openGraph, images: [{ url: 'https://own' }] } };
    expect(applySeo(withImage, { ...empty, defaultOgImageUrl: 'https://cdn/d.png' }, {}).openGraph).toMatchObject({ images: [{ url: 'https://own' }] });
  });

  it('maps robots flags, keeping the other side at its default', () => {
    expect(applySeo(base, { ...empty, robotsIndex: false }, {}).robots).toEqual({ index: false, follow: true });
    expect(applySeo(base, { ...empty, robotsFollow: false }, {}).robots).toEqual({ index: true, follow: false });
  });

  it('never re-indexes a page the code marked noindex', () => {
    const notFound: Metadata = { title: 'Evento', robots: { index: false, follow: false } };
    expect(applySeo(notFound, { ...empty, robotsIndex: true }, {}).robots).toEqual({ index: false, follow: false });
  });
});

describe('resolveJsonLd', () => {
  const event = { '@context': 'https://schema.org', '@type': 'Event', name: 'Show' };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList' };

  it('returns generated blocks when config is null', () => expect(resolveJsonLd([event, crumbs], null, {})).toEqual([event, crumbs]));

  it('drops disabled generated types and appends extras with placeholders', () => {
    const out = resolveJsonLd([event, crumbs], {
      ...empty,
      disabledGeneratedJsonLd: ['BreadcrumbList'],
      extraJsonLd: ['{"@context":"https://schema.org","@type":"FAQPage","name":"FAQ {{event.name}}"}'],
    }, { 'event.name': 'Show' });
    expect(out).toEqual([event, { '@context': 'https://schema.org', '@type': 'FAQPage', name: 'FAQ Show' }]);
  });

  it('JSON-escapes substituted values (quotes, backslashes, newlines, </script>)', () => {
    const nasty = 'He said "hi" \\ </script><script>alert(1)</script>\nline2';
    const [block] = resolveJsonLd([], { ...empty, extraJsonLd: ['{"@context":"https://schema.org","@type":"Thing","name":"{{event.description}}"}'] }, { 'event.description': nasty });
    expect(block.name).toBe(nasty);
  });

  it('drops a block that fails to parse at render time and logs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveJsonLd([event], { ...empty, extraJsonLd: ['{oops'] }, {})).toEqual([event]);
    expect(warn).toHaveBeenCalled();
  });

  it('flattens an array block', () => {
    const out = resolveJsonLd([], { ...empty, extraJsonLd: ['[{"@context":"https://schema.org","@type":"A"},{"@context":"https://schema.org","@type":"B"}]'] }, {});
    expect(out.map((b) => b['@type'])).toEqual(['A', 'B']);
  });
});
