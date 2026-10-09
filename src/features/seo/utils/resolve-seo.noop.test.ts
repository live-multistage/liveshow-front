import { describe, it, expect } from 'vitest';
import { SEO_PAGE_KEYS, type ResolvedSeoConfig } from '@live-show/api-contracts';
import type { Metadata } from 'next';
import { applySeo, resolveJsonLd } from './resolve-seo';

const sample: Metadata = {
  title: 'T',
  description: 'D',
  alternates: { canonical: '/x' },
  openGraph: { title: 'T', description: 'D' },
  twitter: { card: 'summary_large_image', title: 'T' },
};
const blocks = [{ '@type': 'Event' }, { '@type': 'BreadcrumbList' }];

describe('an empty SEO config is a no-op', () => {
  it.each(SEO_PAGE_KEYS)('%s', (pageKey) => {
    const empty: ResolvedSeoConfig = {
      pageKey, defaultOgImageUrl: null, titleTemplate: null, descriptionTemplate: null, ogImageUrl: null,
      robotsIndex: null, robotsFollow: null, disabledGeneratedJsonLd: [], extraJsonLd: [],
      keywords: null, ogTitle: null, ogDescription: null, twitterTitle: null, twitterDescription: null,
      canonicalUrl: null, locale: null, jsonLdMode: 'COMPLEMENT',
    };
    expect(applySeo(sample, empty, {})).toEqual(sample);
    expect(resolveJsonLd(blocks, empty, {})).toEqual(blocks);
  });
});
