import type { SeoPageKey } from './page-keys';

export const SEO_LOCALES = ['pt-BR', 'en', 'es'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

export const JSONLD_MODES = ['COMPLEMENT', 'REPLACE'] as const;
export type JsonLdMode = (typeof JSONLD_MODES)[number];

export interface SeoFields {
  titleTemplate: string | null;
  descriptionTemplate: string | null;
  ogImageUrl: string | null;
  keywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  canonicalUrl: string | null;
  locale: SeoLocale | null;
  jsonLdMode: JsonLdMode | null;
  robotsIndex: boolean | null;
  robotsFollow: boolean | null;
  disabledGeneratedJsonLd: string[];
  // Raw JSON text per block; placeholders survive because they live inside JSON strings.
  extraJsonLd: string[];
}

export interface SeoPageTemplate extends SeoFields {
  pageKey: SeoPageKey;
  updatedAt: string | null;
}

export interface SeoPathOverride extends SeoFields {
  id: string;
  path: string;
  pageKey: SeoPageKey;
  updatedAt: string;
}

export interface SeoRobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export interface SeoGlobal {
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  defaultOgImageUrl: string | null;
  organizationJsonLd: string | null;
  websiteJsonLd: string | null;
  robotsExtraRules: SeoRobotsRule[];
}

// What a public page receives: template and override already merged (override wins
// field by field when non-null; JSON-LD lists concatenate), placeholders unresolved.
export interface ResolvedSeoConfig extends Omit<SeoFields, 'jsonLdMode'> {
  jsonLdMode: JsonLdMode;
  pageKey: SeoPageKey;
  defaultOgImageUrl: string | null;
}

export type SeoFieldsInput = Partial<SeoFields>;

export interface SeoNoindex {
  paths: string[];
  pageKeys: SeoPageKey[];
}
