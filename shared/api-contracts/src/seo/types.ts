import type { SeoPageKey } from './page-keys';

export interface SeoFields {
  titleTemplate: string | null;
  descriptionTemplate: string | null;
  ogImageUrl: string | null;
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
export interface ResolvedSeoConfig extends SeoFields {
  pageKey: SeoPageKey;
  defaultOgImageUrl: string | null;
}

export type SeoFieldsInput = Partial<SeoFields>;

export interface SeoNoindex {
  paths: string[];
  pageKeys: SeoPageKey[];
}
