import type { Metadata } from 'next';
import { OG_LOCALE, jsonLdTypes, type ResolvedSeoConfig } from '@live-show/api-contracts';

export type SeoVars = Partial<Record<string, string | number | null | undefined>>;

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

export function siteVars() {
  return { 'site.name': 'showon.io', 'site.url': SITE_URL };
}

function valueOf(vars: SeoVars, name: string): string {
  const value = vars[name];
  return value == null ? '' : String(value);
}

export function fillPlaceholders(template: string, vars: SeoVars): string {
  return template.replace(PLACEHOLDER, (_, name: string) => valueOf(vars, name));
}

function resolvedText(template: string | null, vars: SeoVars): string | null {
  if (template == null) return null;
  const text = fillPlaceholders(template, vars).trim();
  return text || null;
}

// Overlays admin SEO onto the metadata the page already builds. Anything the
// admin left empty keeps the code default, so an empty config is a no-op.
export function applySeo(base: Metadata, config: ResolvedSeoConfig | null, vars: SeoVars): Metadata {
  if (!config) return base;
  const allVars = { ...siteVars(), ...vars };
  const title = resolvedText(config.titleTemplate, allVars);
  const description = resolvedText(config.descriptionTemplate, allVars);
  const ogTitle = resolvedText(config.ogTitle, allVars) ?? title;
  const ogDescription = resolvedText(config.ogDescription, allVars) ?? description;
  const twitterTitle = resolvedText(config.twitterTitle, allVars) ?? ogTitle;
  const twitterDescription = resolvedText(config.twitterDescription, allVars) ?? ogDescription;
  const keywords = resolvedText(config.keywords, allVars);
  const baseOg = base.openGraph ?? {};
  const ogImage = config.ogImageUrl ?? (baseOg.images ? null : config.defaultOgImageUrl);
  const ogLocale = config.locale ? OG_LOCALE[config.locale] : null;

  const out: Metadata = { ...base };
  // An absolute base title opts out of the layout template; keep it that way.
  const absoluteBase = typeof base.title === 'object' && base.title !== null && 'absolute' in base.title;
  if (title) out.title = absoluteBase ? { absolute: title } : title;
  if (description) out.description = description;
  if (keywords) out.keywords = keywords;
  if (config.canonicalUrl) out.alternates = { ...base.alternates, canonical: config.canonicalUrl };
  if (ogTitle || ogDescription || ogImage || ogLocale) {
    out.openGraph = {
      ...baseOg,
      ...(ogTitle && { title: ogTitle }),
      ...(ogDescription && { description: ogDescription }),
      ...(ogImage && { images: [{ url: ogImage }] }),
      ...(ogLocale && { locale: ogLocale }),
    };
  }
  if (twitterTitle || twitterDescription) {
    // Pages without a code-level twitter card would drop the admin fields, so build one.
    const image = ogImage ?? firstImageUrl(baseOg.images);
    out.twitter = base.twitter
      ? {
          ...base.twitter,
          ...(twitterTitle && { title: twitterTitle }),
          ...(twitterDescription && { description: twitterDescription }),
        }
      : {
          card: 'summary_large_image',
          ...(twitterTitle && { title: twitterTitle }),
          ...(twitterDescription && { description: twitterDescription }),
          ...(image && { images: [image] }),
        };
  }

  // A page the code already marked noindex (soft 404) stays noindex.
  const codeRobots = typeof base.robots === 'object' && base.robots ? base.robots : null;
  if (codeRobots?.index === false) return out;
  if (config.robotsIndex != null || config.robotsFollow != null) {
    out.robots = { index: config.robotsIndex ?? true, follow: config.robotsFollow ?? true };
  }
  return out;
}

function firstImageUrl(images: unknown): string | null {
  const first = [images].flat()[0];
  if (typeof first === 'string') return first;
  if (first instanceof URL) return first.toString();
  const url = isObject(first) ? first.url : null;
  return typeof url === 'string' ? url : url instanceof URL ? url.toString() : null;
}

function escapeForJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

// Placeholders live inside JSON strings (enforced on save), so substituting a
// JSON-escaped value keeps the text valid JSON whatever the data contains.
export function resolveJsonLd(
  generated: Record<string, unknown>[],
  config: ResolvedSeoConfig | null,
  vars: SeoVars,
): Record<string, unknown>[] {
  if (!config) return generated;
  const allVars = { ...siteVars(), ...vars };
  const extras = config.extraJsonLd.flatMap((raw) => {
    const filled = raw.replace(PLACEHOLDER, (_, name: string) => escapeForJsonString(valueOf(allVars, name)));
    try {
      const parsed: unknown = JSON.parse(filled);
      // A legacy primitive/null must not reach withInLanguage.
      return [parsed].flat().filter(isObject);
    } catch {
      console.warn(`[seo] dropping unparseable JSON-LD block for ${config.pageKey}`);
      return [];
    }
  });
  // COMPLEMENT: an admin block declaring a type replaces the generated one of that type.
  const declared = new Set(extras.flatMap(jsonLdTypes));
  const kept =
    config.jsonLdMode === 'REPLACE'
      ? []
      : generated.filter((block) => {
          const type = String(block['@type']);
          return !config.disabledGeneratedJsonLd.includes(type) && !declared.has(type);
        });
  const blocks = [...kept, ...extras];
  const { locale } = config;
  return locale ? blocks.map((block) => withInLanguage(block, locale)) : blocks;
}

const IN_LANGUAGE_TYPES = new Set([
  'WebPage', 'CollectionPage', 'WebSite', 'Event', 'MusicEvent', 'CreativeWork', 'Article', 'VideoObject', 'BroadcastEvent',
]);

// Shallow clones only; never overwrites a language the block already declares.
function withInLanguage(node: Record<string, unknown>, locale: string): Record<string, unknown> {
  const graph = node['@graph'];
  const next: Record<string, unknown> = Array.isArray(graph)
    ? { ...node, '@graph': graph.map((item) => (isObject(item) ? withInLanguage(item, locale) : item)) }
    : { ...node };
  const own = [node['@type']].flat();
  if (next.inLanguage === undefined && own.some((t) => typeof t === 'string' && IN_LANGUAGE_TYPES.has(t))) next.inLanguage = locale;
  return next;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
