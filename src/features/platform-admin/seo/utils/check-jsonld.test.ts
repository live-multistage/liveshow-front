import { describe, expect, it } from 'vitest';
import { checkJsonLd } from './check-jsonld';

describe('checkJsonLd', () => {
  it('accepts a valid object', () => {
    expect(checkJsonLd('{"@context":"x","@type":"T","n":"{{site.name}}"}', ['site.name'])).toEqual({ ok: true });
  });
  it('flags invalid JSON', () => {
    expect(checkJsonLd('{bad', [])).toEqual({ ok: false, reason: 'json' });
  });
  it('flags wrong shape', () => {
    expect(checkJsonLd('"x"', [])).toEqual({ ok: false, reason: 'shape' });
  });
  it('flags unknown placeholders with the name', () => {
    expect(checkJsonLd('{"@context":"x","@type":"T","n":"{{nope}}"}', ['site.name'])).toEqual({
      ok: false,
      reason: 'placeholder',
      detail: 'nope',
    });
  });
});
