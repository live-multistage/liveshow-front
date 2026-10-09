import { describe, expect, it } from 'vitest';
import { checkJsonLd } from './check-jsonld';

describe('checkJsonLd', () => {
  it('accepts a valid object and reports its types', () => {
    expect(checkJsonLd('{"@context":"x","@type":"T","n":"{{site.name}}"}', ['site.name'])).toEqual({ ok: true, types: ['T'] });
  });
  it('lists the @type of every @graph item', () => {
    const raw = '{"@context":"x","@graph":[{"@type":"A"},{"@type":"B"}]}';
    expect(checkJsonLd(raw, [])).toEqual({ ok: true, types: ['A', 'B'] });
  });
  it('flags invalid JSON', () => {
    expect(checkJsonLd('{bad', [])).toEqual({ ok: false, reason: 'json' });
  });
  it('flags wrong shape', () => {
    expect(checkJsonLd('"x"', [])).toEqual({ ok: false, reason: 'shape' });
  });
  it('flags a missing @context, a typeless graph item and an oversized block', () => {
    expect(checkJsonLd('{"@type":"T"}', [])).toEqual({ ok: false, reason: 'context' });
    expect(checkJsonLd('{"@context":"x","@graph":[{"name":"n"}]}', [])).toEqual({ ok: false, reason: 'graph' });
    expect(checkJsonLd(`"${'a'.repeat(65536)}"`, [])).toEqual({ ok: false, reason: 'size' });
  });
  it('flags unknown placeholders with the name', () => {
    expect(checkJsonLd('{"@context":"x","@type":"T","n":"{{nope}}"}', ['site.name'])).toEqual({
      ok: false,
      reason: 'placeholder',
      detail: 'nope',
    });
  });
});
