export const PAGE_SECTION_TYPES = ['hero','audience','text','features','how','media','stats','rail','featured','pricing','faq','final'] as const;
export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
// Reserved for a future phase: 'ENTITY_TEMPLATE'.
export const PAGE_KINDS = ['STANDALONE'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
// Reserved for a future phase: 'event' | 'catalog'.
export const PAGE_CONTEXT_TYPES = ['none'] as const;
export type PageContextType = (typeof PAGE_CONTEXT_TYPES)[number];
// [] = works in any context; otherwise the document's context.type must be listed.
export const PAGE_SECTION_REQUIRES_CONTEXT: Record<PageSectionType, readonly PageContextType[]> = {
  hero: [], audience: [], text: [], features: [], how: [], media: [], stats: [],
  rail: [], featured: [], pricing: [], faq: [], final: [],
};
export const PAGE_STATUSES = ['DRAFT','PUBLISHED','ARCHIVED'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];
export const PAGE_LIMITS = { maxSections: 30, titleMax: 80, slugMax: 60, seoTitleMax: 60, seoDescriptionMax: 160,
  changeSummaryMax: 140, urlMax: 2048, ctaLabelMax: 28, headingMax: 90, eyebrowMax: 40, textMax: 2000,
  itemTitleMax: 60, itemTextMax: 200, altMax: 140, captionMax: 140, faqQuestionMax: 160, faqAnswerMax: 1000,
  statValueMax: 12, statLabelMax: 40, counterLabelMax: 24, railTitleMax: 60, planNameMax: 40, planPriceMax: 24,
  draftMaxBytes: 262144 } as const;
export const PAGE_RAIL_LIMITS = [4, 8, 12] as const;
export type PageRailLimit = (typeof PAGE_RAIL_LIMITS)[number];
export const PAGE_RAIL_SOURCES = ['category','organization','artist','live'] as const;
export type PageRailSourceKind = (typeof PAGE_RAIL_SOURCES)[number];
export const PAGE_SECTION_BACKGROUNDS = ['default','accent','image'] as const;
export type PageSectionBackground = (typeof PAGE_SECTION_BACKGROUNDS)[number];
export const PAGE_SECTION_SPACINGS = ['compact','normal','wide'] as const;
export type PageSectionSpacing = (typeof PAGE_SECTION_SPACINGS)[number];
export const PAGE_SECTION_SHOW_ON = ['all','desktop','mobile'] as const;
export type PageSectionShowOn = (typeof PAGE_SECTION_SHOW_ON)[number];
export const PAGE_SLUG_RE = /^[a-z0-9](-?[a-z0-9])*$/;
export const RESERVED_PAGE_SLUGS: readonly string[] = ['admin','api','dashboard','login','p','preview','new','edit','settings','sitemap','robots','static','assets','_next'];

export interface PageTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export interface PageCta {
  label: string;
  href: string;
}

export interface PageImage {
  url: string;
  alt: string;
}

export interface PageCounter {
  value: string;
  label: string;
}

export interface PageFeatureItem {
  icon?: string;
  title: string;
  text: string;
}

export interface PageStep {
  title: string;
  text: string;
}

export interface PageStat {
  value: string;
  label: string;
}

export interface PageRailSource {
  kind: PageRailSourceKind;
  id?: string;
}

export interface PagePlan {
  name: string;
  price: string;
  description?: string;
  cta?: PageCta;
}

export interface PageFaqItem {
  question: string;
  answer: string;
}

export interface PageSectionAppearance {
  background: PageSectionBackground;
  spacing: PageSectionSpacing;
  showOn: PageSectionShowOn;
}

export interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: PageCta;
  secondaryCta?: PageCta;
  image?: PageImage;
}

export interface AudienceProps {
  text: string;
  counters: PageCounter[];
}

export interface TextProps {
  title?: string;
  paragraphs: PageTextRun[][];
}

export interface FeaturesProps {
  title: string;
  items: PageFeatureItem[];
}

export interface HowProps {
  eyebrow?: string;
  title: string;
  steps: PageStep[];
}

export interface MediaProps {
  kind: 'image' | 'video';
  url: string;
  alt: string;
  caption?: string;
}

export interface StatsProps {
  title?: string;
  items: PageStat[];
}

export interface RailProps {
  title: string;
  source: PageRailSource;
  limit: PageRailLimit;
}

export interface FeaturedProps {
  eventId: string;
  ctaLabel?: string;
}

export interface PricingProps {
  title: string;
  plans: PagePlan[];
}

export interface FaqProps {
  title: string;
  items: PageFaqItem[];
}

export interface FinalProps {
  title: string;
  subtitle?: string;
  cta: PageCta;
}

export interface PageSectionPropsByType {
  hero: HeroProps;
  audience: AudienceProps;
  text: TextProps;
  features: FeaturesProps;
  how: HowProps;
  media: MediaProps;
  stats: StatsProps;
  rail: RailProps;
  featured: FeaturedProps;
  pricing: PricingProps;
  faq: FaqProps;
  final: FinalProps;
}

export type PageSection<T extends PageSectionType = PageSectionType> = {
  [K in T]: {
    id: string;
    type: K;
    hidden: boolean;
    appearance: PageSectionAppearance;
    props: PageSectionPropsByType[K];
  };
}[T];

export interface PageDocument {
  schemaVersion: 1;
  context: { type: PageContextType };
  sections: PageSection[];
}

export interface PageSeo {
  title?: string;
  description?: string;
  imageUrl?: string;
  noindex: boolean;
}

export interface PageSummary {
  id: string;
  title: string;
  slug: string;
  kind: PageKind;
  status: PageStatus;
  hasUnpublishedChanges: boolean;
  publishedVersion: number | null;
  draftUpdatedAt: string;
  draftUpdatedBy: { id: string; name: string } | null;
  sectionCount: number;
}

export interface PageDetail extends PageSummary {
  draft: PageDocument;
  draftRevision: number;
  seo: PageSeo;
}

export interface PageVersionSummary {
  number: number;
  changeSummary: string;
  publishedAt: string;
  publishedBy: { id: string; name: string } | null;
  isLive: boolean;
}

export interface PublishDiff {
  added: number;
  removed: number;
  edited: number;
  hidden: number;
}

export interface PublishDiffResponse extends PublishDiff {
  hasChanges: boolean;
  nextVersionNumber: number;
}

export interface PageVersionDocument {
  number: number;
  document: PageDocument;
}

export interface DraftConflict {
  code: 'DRAFT_CONFLICT';
  currentRevision: number;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string;
}

export interface ResolvedRailEvent {
  id: string;
  title: string;
  slug?: string;
  posterUrl: string | null;
  startsAt: string | null;
  isLive: boolean;
}

export interface PublicPage {
  slug: string;
  title: string;
  seo: PageSeo;
  document: PageDocument;
  publishedAt: string;
  version: number;
  resolved: {
    rails: Record<string, ResolvedRailEvent[]>;
    featured: Record<string, ResolvedRailEvent | null>;
  };
}

export interface PublicPageListItem {
  slug: string;
  updatedAt: string;
}

export function slugifyPageTitle(title: string): string {
  const ascii = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ascii.slice(0, PAGE_LIMITS.slugMax).replace(/-+$/, '');
}

export function pageSlugError(slug: string): 'format' | 'reserved' | null {
  if (!slug || slug.length > PAGE_LIMITS.slugMax) return 'format';
  if (RESERVED_PAGE_SLUGS.includes(slug)) return 'reserved';
  return PAGE_SLUG_RE.test(slug) ? null : 'format';
}

export interface PageAssetResponse {
  url: string;
}

export const PAGE_ASSET_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
} as const;
