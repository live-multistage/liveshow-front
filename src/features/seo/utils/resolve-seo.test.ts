import { describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';
import type { ResolvedSeoConfig } from '@live-show/api-contracts';
import { applySeo, fillPlaceholders, resolveJsonLd } from './resolve-seo';

const empty: ResolvedSeoConfig = {
  pageKey: 'events.detail', defaultOgImageUrl: null, titleTemplate: null, descriptionTemplate: null, ogImageUrl: null,
  robotsIndex: null, robotsFollow: null, disabledGeneratedJsonLd: [], extraJsonLd: [],
  keywords: null, ogTitle: null, ogDescription: null, twitterTitle: null, twitterDescription: null,
  canonicalUrl: null, locale: null, jsonLdMode: 'COMPLEMENT',
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

describe('advanced precedence', () => {
  const vars = { 'event.name': 'Show' };
  it('og/twitter fall back to meta, twitter falls back to og', () => {
    const out = applySeo(base, { ...empty, titleTemplate: 'T {{event.name}}', ogDescription: 'OG D' }, vars);
    expect(out.openGraph).toMatchObject({ title: 'T Show', description: 'OG D' });
    expect(out.twitter).toMatchObject({ title: 'T Show', description: 'OG D' });
  });
  it('specific twitter wins', () => {
    const out = applySeo(base, { ...empty, ogTitle: 'OG', twitterTitle: 'TW' }, {});
    expect(out.openGraph).toMatchObject({ title: 'OG' });
    expect(out.twitter).toMatchObject({ title: 'TW' });
    expect(out.title).toBe(base.title);
  });
  it('keywords emitted only when set', () => {
    expect(applySeo(base, { ...empty, keywords: 'a, b' }, {}).keywords).toBe('a, b');
    expect(applySeo(base, empty, {}).keywords).toBeUndefined();
  });
  it('canonical override', () =>
    expect(applySeo(base, { ...empty, canonicalUrl: 'https://showon.io/x' }, {}).alternates).toMatchObject({ canonical: 'https://showon.io/x' }));
  it('og:locale from locale', () =>
    expect(applySeo(base, { ...empty, locale: 'en' }, {}).openGraph).toMatchObject({ locale: 'en_US' }));
});

describe('JSON-LD modes', () => {
  const event = { '@context': 'https://schema.org', '@type': 'Event', name: 'S' };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList' };
  const graphWithCrumbs = '{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage"},{"@type":"BreadcrumbList"}]}';
  it('COMPLEMENT auto-disables generated types declared by extras (incl. @graph)', () => {
    const out = resolveJsonLd([event, crumbs], { ...empty, jsonLdMode: 'COMPLEMENT', extraJsonLd: [graphWithCrumbs] }, {});
    expect(out.map((b) => b['@type'] ?? 'graph')).toEqual(['Event', 'graph']);
  });
  it('REPLACE emits only admin blocks', () => {
    const out = resolveJsonLd([event, crumbs], { ...empty, jsonLdMode: 'REPLACE', extraJsonLd: [graphWithCrumbs] }, {});
    expect(out).toHaveLength(1);
    expect(out[0]['@graph']).toBeDefined();
  });
  it('REPLACE with no extras emits nothing', () =>
    expect(resolveJsonLd([event], { ...empty, jsonLdMode: 'REPLACE' }, {})).toEqual([]));
  it('injects inLanguage only into allowed types and never overwrites', () => {
    const out = resolveJsonLd(
      [{ '@context': 'https://schema.org', '@type': 'Event' }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList' }, { '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'es' }],
      { ...empty, locale: 'en' },
      {},
    );
    expect(out[0].inLanguage).toBe('en');
    expect(out[1].inLanguage).toBeUndefined();
    expect(out[2].inLanguage).toBe('es');
  });
});
