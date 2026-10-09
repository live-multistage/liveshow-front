import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const ALLOWED_TAGS = new Set(['seo', 'legal']);

function secretMatches(given: string | null): boolean {
  const expected = process.env.WEB_REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Called by the orchestrator after an admin changes SEO or publishes a legal version.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags : [];
  if (!tags.length || !tags.every((t): t is string => typeof t === 'string' && ALLOWED_TAGS.has(t))) {
    return Response.json({ error: 'invalid tags' }, { status: 400 });
  }
  tags.forEach((tag) => revalidateTag(tag));
  return Response.json({ revalidated: tags });
}
