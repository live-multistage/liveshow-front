import { describe, expect, it } from 'vitest';
import { changedLocales, includedLocales, toContent, toTexts } from './legal-doc';

describe('legal-doc utils', () => {
  it('omits blank EN/ES from the published content', () => {
    expect(toContent({ pt: 'a', en: '  ', es: 'c' })).toEqual({ pt: 'a', es: 'c' });
  });

  it('round-trips content through editor texts', () => {
    expect(toTexts({ pt: 'a' })).toEqual({ pt: 'a', en: '', es: '' });
  });

  it('reports which locales differ from the base', () => {
    const base = { pt: 'a', en: 'b', es: '' };
    expect(changedLocales({ ...base, en: 'x' }, base)).toEqual(['en']);
    expect(changedLocales(base, base)).toEqual([]);
  });

  it('always includes PT and only non-blank others', () => {
    expect(includedLocales({ pt: '', en: 'x', es: ' ' })).toEqual(['pt', 'en']);
  });
});
