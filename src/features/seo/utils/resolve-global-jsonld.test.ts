import { describe, expect, it } from 'vitest';
import type { SeoGlobal } from '@live-show/api-contracts';
import { resolveGlobalJsonLd } from './resolve-global-jsonld';

const defaults = { organization: { '@type': 'Organization' }, website: { '@type': 'WebSite' } };
const global = (patch: Partial<SeoGlobal>): SeoGlobal => ({
  googleSiteVerification: null, bingSiteVerification: null, defaultOgImageUrl: null,
  organizationJsonLd: null, websiteJsonLd: null, robotsExtraRules: [], ...patch,
});

describe('resolveGlobalJsonLd', () => {
  it('returns defaults for null global', () =>
    expect(resolveGlobalJsonLd(null, defaults)).toEqual([defaults.organization, defaults.website]));

  it('valid admin org replaces org only', () =>
    expect(resolveGlobalJsonLd(global({ organizationJsonLd: '{"@type":"Organization","name":"X"}' }), defaults))
      .toEqual([{ '@type': 'Organization', name: 'X' }, defaults.website]));

  it('unparseable admin text keeps the default', () =>
    expect(resolveGlobalJsonLd(global({ websiteJsonLd: '{nope' }), defaults)).toEqual([defaults.organization, defaults.website]));

  it('substitutes site placeholders inside strings', () => {
    const [org] = resolveGlobalJsonLd(global({ organizationJsonLd: '{"url":"{{site.url}}","name":"{{site.name}}"}' }), defaults);
    expect(org).toEqual({ url: 'https://showon.io', name: 'showon.io' });
  });
});
