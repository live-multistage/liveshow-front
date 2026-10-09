const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

export type JsonLdCheck = { ok: true } | { ok: false; reason: 'json' | 'shape' | 'placeholder'; detail?: string };

// Instant feedback only — the API re-validates and is authoritative.
export function checkJsonLd(raw: string, allowedVars: readonly string[]): JsonLdCheck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'json' };
  }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const shapeOk =
    items.length > 0 &&
    items.every((i) => typeof i === 'object' && i !== null && !Array.isArray(i) && '@context' in i && '@type' in i);
  if (!shapeOk) return { ok: false, reason: 'shape' };
  const unknown = [...raw.matchAll(PLACEHOLDER)].map((m) => m[1]).find((n) => !allowedVars.includes(n));
  return unknown ? { ok: false, reason: 'placeholder', detail: unknown } : { ok: true };
}
