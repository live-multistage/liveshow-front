import { describe, expect, it } from 'vitest';
import { JSONLD_STARTERS } from './jsonld-starters';
import { SEO_PAGE_KEYS, SEO_PAGE_VARIABLES } from './page-keys';
import { jsonLdTypes } from './jsonld';

describe('JSONLD_STARTERS', () => {
  it.each(SEO_PAGE_KEYS)('%s parses and uses only allowed variables', (key) => {
    const raw = JSONLD_STARTERS[key];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed['@context']).toBe('https://schema.org');
    const vars = [...raw.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
    for (const v of vars) expect(SEO_PAGE_VARIABLES[key]).toContain(v);
    expect(jsonLdTypes(parsed).length).toBeGreaterThan(0);
  });
  it('events.detail covers Event and BreadcrumbList', () =>
    expect(jsonLdTypes(JSON.parse(JSONLD_STARTERS['events.detail']))).toEqual(expect.arrayContaining(['Event', 'BreadcrumbList'])));
  it('hardcodes no locale; the locale injection adds inLanguage', () =>
    expect(Object.values(JSONLD_STARTERS).join('')).not.toContain('inLanguage'));
});
