import { describe, expect, it } from 'vitest';
import type { SeoGlobal } from '@live-show/api-contracts';
import { buildRootMetadata } from './root-metadata';

const empty: SeoGlobal = {
  googleSiteVerification: null, bingSiteVerification: null, defaultOgImageUrl: null,
  organizationJsonLd: null, websiteJsonLd: null, robotsExtraRules: [],
};
const DESC = 'Shows ao vivo de todo o mundo, na palma da sua mão.';
const legacy = {
  metadataBase: new URL('https://showon.io'),
  title: { default: 'showon.io', template: '%s · showon.io' },
  description: DESC,
  openGraph: { type: 'website', siteName: 'showon.io', url: 'https://showon.io', title: 'showon.io', description: DESC },
  twitter: { card: 'summary_large_image', title: 'showon.io', description: DESC },
};

describe('buildRootMetadata', () => {
  it('null and empty global equal the legacy static metadata', () => {
    expect(buildRootMetadata(null)).toEqual(legacy);
    expect(buildRootMetadata(empty)).toEqual(legacy);
  });

  it('sets verification for google and bing', () => {
    const m = buildRootMetadata({ ...empty, googleSiteVerification: 'g1', bingSiteVerification: 'b1' });
    expect(m.verification).toEqual({ google: 'g1', other: { 'msvalidate.01': 'b1' } });
  });

  it('sets default OG image', () => {
    expect(buildRootMetadata({ ...empty, defaultOgImageUrl: 'https://x/og.png' }).openGraph?.images).toEqual([{ url: 'https://x/og.png' }]);
  });
});
