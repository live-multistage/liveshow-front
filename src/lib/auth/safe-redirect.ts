export function safeRedirect(url: string | undefined): string {
  if (!url) return '/';

  // Reject control characters: tab, CR, LF in the raw input.
  if (/[\t\r\n]/.test(url)) return '/';

  // Try to decode percent-encoding safely; malformed encoding → reject.
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return '/';
  }

  // Reject control characters in the decoded form.
  if (/[\t\r\n]/.test(decoded)) return '/';

  // Reject protocol-relative (//) and backslash variant (/\).
  if (url[0] !== '/' || url[1] === '/' || url[1] === '\\') return '/';

  // Use URL resolution to catch absolute URLs and pseudoprotocols.
  try {
    const resolved = new URL(decoded, 'http://localhost');
    // Must be same-origin; reject https://evil.com, javascript:, data:, etc.
    if (resolved.origin !== 'http://localhost') return '/';
    // Reject decoded paths starting with // (e.g. /%2F/ decodes to //).
    if (resolved.pathname.startsWith('//')) return '/';
  } catch {
    return '/';
  }

  return url;
}
