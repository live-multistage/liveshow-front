export function safeRedirect(url: string | undefined): string {
  // Reject a leading `//` or `/\` — browsers and `new URL()` both treat a
  // backslash right after the first `/` the same as a second `/`, so
  // `/\evil.com` resolves to `http://evil.com/` exactly like `//evil.com`
  // does. Checking only `startsWith('//')` misses that variant.
  if (!url || url[0] !== '/' || url[1] === '/' || url[1] === '\\') return '/';
  return url;
}
