// Guards the notification `link` before it reaches <Link href>. The backend
// already validates it (IsSafeLink), but the frontend must not trust a value
// that could predate the fix or arrive from another source: an active scheme
// (javascript:/data:) in an href is stored XSS. Allow only a same-origin
// relative path or an https:// URL; reject protocol-relative and schemes.
export function isSafeNotificationLink(href: string | null | undefined): href is string {
  if (typeof href !== 'string') return false;
  const v = href.trim();
  if (v.length === 0 || v.length > 512) return false;

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
