import type { Metadata } from 'next';
import type { SeoGlobal } from '@live-show/api-contracts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';
export const SITE_DESCRIPTION = 'Shows ao vivo de todo o mundo, na palma da sua mão.';

// Empty/absent admin global leaves the code defaults untouched.
export function buildRootMetadata(global: SeoGlobal | null): Metadata {
  const google = global?.googleSiteVerification;
  const bing = global?.bingSiteVerification;
  const ogImage = global?.defaultOgImageUrl;
  return {
    // Anchors every relative URL in OG/canonical/twitter metadata to the real
    // host — without it Next resolves them against localhost.
    metadataBase: new URL(SITE_URL),
    title: { default: 'showon.io', template: '%s · showon.io' },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: 'website',
      siteName: 'showon.io',
      url: SITE_URL,
      title: 'showon.io',
      description: SITE_DESCRIPTION,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: { card: 'summary_large_image', title: 'showon.io', description: SITE_DESCRIPTION },
    ...((google || bing) && {
      verification: {
        ...(google && { google }),
        ...(bing && { other: { 'msvalidate.01': bing } }),
      },
    }),
  };
}
