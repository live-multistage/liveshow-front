import type { Metadata } from 'next';
import type { ResolvedSeoConfig } from '@live-show/api-contracts';

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
  const baseOg = base.openGraph ?? {};
  const ogImage = config.ogImageUrl ?? (baseOg.images ? null : config.defaultOgImageUrl);

  const out: Metadata = { ...base };
  if (title) out.title = title;
  if (description) out.description = description;
  if (title || description || ogImage) {
    out.openGraph = {
      ...baseOg,
      ...(title && { title }),
      ...(description && { description }),
      ...(ogImage && { images: [{ url: ogImage }] }),
    };
  }
  if ((title || description) && base.twitter) {
    out.twitter = { ...base.twitter, ...(title && { title }), ...(description && { description }) };
  }

  // A page the code already marked noindex (soft 404) stays noindex.
  const codeRobots = typeof base.robots === 'object' && base.robots ? base.robots : null;
  if (codeRobots?.index === false) return out;
  if (config.robotsIndex != null || config.robotsFollow != null) {
    out.robots = { index: config.robotsIndex ?? true, follow: config.robotsFollow ?? true };
  }
  return out;
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
  const kept = generated.filter((block) => !config.disabledGeneratedJsonLd.includes(String(block['@type'])));
  const extras = config.extraJsonLd.flatMap((raw) => {
    const filled = raw.replace(PLACEHOLDER, (_, name: string) => escapeForJsonString(valueOf(allVars, name)));
    try {
      const parsed = JSON.parse(filled) as Record<string, unknown> | Record<string, unknown>[];
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      console.warn(`[seo] dropping unparseable JSON-LD block for ${config.pageKey}`);
      return [];
    }
  });
  return [...kept, ...extras];
}
