import { describe, expect, it } from 'vitest';
import { jsonLdTypes, stripJsonLdScriptTag } from './jsonld';

const graph = '{"@context":"https://schema.org","@graph":[{"@type":"CollectionPage"},{"@type":"BreadcrumbList"}]}';

describe('stripJsonLdScriptTag', () => {
  it('removes the ld+json wrapper', () =>
    expect(stripJsonLdScriptTag(`<script type="application/ld+json">\n${graph}\n</script>`)).toBe(graph));
  it('is case/whitespace tolerant and accepts extra attributes', () =>
    expect(stripJsonLdScriptTag(`  <SCRIPT  id="x" type='application/ld+json' >${graph}</SCRIPT>  `)).toBe(graph));
  it('leaves unwrapped JSON alone (trimmed)', () => expect(stripJsonLdScriptTag(`  ${graph} `)).toBe(graph));
  it('does not strip a non-ld+json script', () =>
    expect(stripJsonLdScriptTag('<script>{"a":1}</script>')).toBe('<script>{"a":1}</script>'));
  it('only strips one outer wrapper', () =>
    expect(stripJsonLdScriptTag('<script type="application/ld+json"><script type="application/ld+json">{}</script></script>'))
      .toBe('<script type="application/ld+json">{}</script>'));
});

describe('jsonLdTypes', () => {
  it('collects top-level and @graph types', () =>
    expect(jsonLdTypes(JSON.parse(graph))).toEqual(['CollectionPage', 'BreadcrumbList']));
  it('handles arrays of blocks and array @type', () =>
    expect(jsonLdTypes([{ '@type': ['Event', 'MusicEvent'] }, { '@type': 'Person' }])).toEqual(['Event', 'MusicEvent', 'Person']));
  it('ignores non-objects', () => expect(jsonLdTypes('x')).toEqual([]));
});
