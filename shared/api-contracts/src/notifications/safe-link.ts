// Guards the notification `link` before it reaches a navigation call. The
// backend already validates it (IsSafeLink), but a client must not trust a
// value that could predate the fix or arrive from another source: an active
// scheme (javascript:/data:) in an href is stored XSS.

const MAX_LINK_LENGTH = 512;

/**
 * Web guard: allow a same-origin relative path or an https:// URL, reject
 * protocol-relative and schemes. Kept as-is — the web renders these in an
 * <a href> where an absolute https URL is a legitimate destination.
 */
export function isSafeNotificationLink(href: string | null | undefined): href is string {
  if (typeof href !== 'string') return false;
  const v = href.trim();
  if (v.length === 0 || v.length > MAX_LINK_LENGTH) return false;

  if (v.startsWith('/')) {
    return !(v.startsWith('//') || v.startsWith('/\\'));
  }

  try {
    const url = new URL(v);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Native guard: a phone has no address bar, so the only usable destination is
 * a route this app actually declares. An allowlist of route prefixes is the
 * whole rule — an https URL that the web would happily open is `null` here,
 * and so is any in-app path outside these five sections.
 */
const ALLOWED_PREFIXES = ['/events/', '/live/', '/replay/', '/tickets/', '/purchases/'] as const;

export function safeNotificationHref(link: string | null | undefined): string | null {
  if (typeof link !== 'string') return null;
  const v = link.trim();
  if (v.length === 0 || v.length > MAX_LINK_LENGTH) return null;
  if (v.startsWith('//') || v.startsWith('/\\')) return null;
  if (v.includes('\\')) return null;
  if (/%2e%2e/i.test(v)) return null;
  if (!ALLOWED_PREFIXES.some((prefix) => v.startsWith(prefix))) return null;
  // A prefix match alone is not enough: "/events/" with nothing after it is
  // not a route, it is the list page reached another way. A ".." segment
  // anywhere would walk the route back out of the allowlisted section.
  const rest = v.slice(v.indexOf('/', 1) + 1);
  if (rest.length === 0) return null;
  const pathOnly = v.split(/[?#]/)[0] ?? v;
  const segments = pathOnly.split('/');
  if (segments.some((segment) => segment === '..')) return null;
  return v;
}
