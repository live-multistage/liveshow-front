import { describe, expect, it } from 'vitest';
import pt from '../../../messages/pt.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';

// The ad-partnership card/queue keys must exist with the same shape in every
// locale catalog — a missing key silently falls back to raw key names in
// production instead of failing loudly. Repo has no generic catalog-parity
// test yet, so this is scoped to the keys this feature introduced.
function keySet(obj: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      out.add(path);
      for (const nested of keySet(value, path)) out.add(nested);
    }
  }
  return out;
}

describe('ad-partnership message catalogs', () => {
  it('pt/en/es share the same dashboard.monetization keys', () => {
    const [ptKeys, enKeys, esKeys] = [pt, en, es].map((c) => keySet(c.dashboard.monetization));
    expect(enKeys).toEqual(ptKeys);
    expect(esKeys).toEqual(ptKeys);
  });

  it('pt/en/es share the same platformAdmin.adPartnerships keys', () => {
    const [ptKeys, enKeys, esKeys] = [pt, en, es].map((c) => keySet(c.platformAdmin.adPartnerships));
    expect(enKeys).toEqual(ptKeys);
    expect(esKeys).toEqual(ptKeys);
  });
});
