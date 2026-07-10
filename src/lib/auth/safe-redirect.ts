export function safeRedirect(url: string | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}
