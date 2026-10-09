const WRAPPER = /^\s*<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*)<\/script>\s*$/i;

// Admins paste what they copy from SEO tools: a full <script> tag. We store the JSON only.
export function stripJsonLdScriptTag(raw: string): string {
  const match = WRAPPER.exec(raw);
  return (match ? match[1] : raw).trim();
}

function typesOf(node: unknown): string[] {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return [];
  const t = (node as Record<string, unknown>)['@type'];
  const own = typeof t === 'string' ? [t] : Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : [];
  const graph = (node as Record<string, unknown>)['@graph'];
  return [...own, ...(Array.isArray(graph) ? graph.flatMap(typesOf) : [])];
}

export function jsonLdTypes(parsed: unknown): string[] {
  return Array.isArray(parsed) ? parsed.flatMap(typesOf) : typesOf(parsed);
}
