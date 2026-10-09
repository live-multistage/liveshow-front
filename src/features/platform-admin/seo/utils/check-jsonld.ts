import { SEO_LIMITS, jsonLdTypes } from '@live-show/api-contracts';

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

export type JsonLdCheck =
  | { ok: true; types: string[] }
  | { ok: false; reason: 'json' | 'shape' | 'context' | 'graph' | 'size' | 'placeholder'; detail?: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function shapeProblem(items: unknown[]): 'shape' | 'context' | 'graph' | null {
  if (items.length === 0 || !items.every(isObject)) return 'shape';
  if (!items.every((i) => '@context' in i)) return 'context';
  for (const item of items as Record<string, unknown>[]) {
    const graph = item['@graph'];
    if (Array.isArray(graph)) {
      if (!graph.every((g) => isObject(g) && '@type' in g)) return 'graph';
    } else if (!('@type' in item)) return 'shape';
  }
  return null;
}

// Instant feedback only — the API re-validates and is authoritative.
export function checkJsonLd(raw: string, allowedVars: readonly string[]): JsonLdCheck {
  if (new TextEncoder().encode(raw).length > SEO_LIMITS.jsonLdBytes) return { ok: false, reason: 'size' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'json' };
  }
  const problem = shapeProblem(Array.isArray(parsed) ? parsed : [parsed]);
  if (problem) return { ok: false, reason: problem };
  const unknown = [...raw.matchAll(PLACEHOLDER)].map((m) => m[1]).find((n) => !allowedVars.includes(n));
  return unknown ? { ok: false, reason: 'placeholder', detail: unknown } : { ok: true, types: jsonLdTypes(parsed) };
}

// Types a block declares, for the "replaced by your block" marker; unparseable text declares none.
export function declaredJsonLdTypes(raw: string): string[] {
  try {
    return jsonLdTypes(JSON.parse(raw));
  } catch {
    return [];
  }
}
