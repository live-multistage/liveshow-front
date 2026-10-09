import type { SeoGlobal } from '@live-show/api-contracts';
import { siteVars } from './resolve-seo';

type Block = Record<string, unknown>;

// Placeholders sit inside JSON strings; substituting JSON-escaped values keeps the text valid.
function parseBlock(raw: string): Block | null {
  const vars: Record<string, string> = siteVars();
  const filled = raw.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => JSON.stringify(vars[name] ?? '').slice(1, -1));
  try {
    return JSON.parse(filled) as Block;
  } catch {
    return null;
  }
}

// Admin text replaces a root block only when it parses; otherwise the code default stays.
export function resolveGlobalJsonLd(global: SeoGlobal | null, defaults: { organization: Block; website: Block }): Block[] {
  const organization = (global?.organizationJsonLd && parseBlock(global.organizationJsonLd)) || defaults.organization;
  const website = (global?.websiteJsonLd && parseBlock(global.websiteJsonLd)) || defaults.website;
  return [organization, website];
}
