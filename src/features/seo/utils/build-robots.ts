import type { MetadataRoute } from 'next';
import type { SeoRobotsRule } from '@live-show/api-contracts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

export const FIXED_DISALLOW = [
  '/api/', '/dashboard/', '/broadcaster-dock/', '/checkin/', '/login', '/register', '/forgot-password',
  '/reset-password', '/checkout', '/cart', '/account/', '/settings/', '/tickets/', '/purchases/',
  '/my-list/', '/wishlist/', '/notifications/', '/live/', '/watch/', '/replay/',
];

export const SINGLE_LINE = /^[^\r\n]+$/;

// RFC 9309: a crawler obeys only its most specific group, so a group for e.g.
// Googlebot would otherwise make every FIXED_DISALLOW path crawlable by it.
// Each admin group therefore carries the fixed disallows too — except a group
// that already blocks everything. A group with no paths also lands here, which
// keeps it from being merged into the next one.
export function groupDisallow(adminDisallow: string[]): string[] {
  if (adminDisallow.includes('/')) return ['/'];
  return [...new Set([...FIXED_DISALLOW, ...adminDisallow])];
}

// Code rules first and immutable; admin rules only add groups after them.
export function buildRobots(extra: SeoRobotsRule[]): MetadataRoute.Robots {
  const adminRules = extra
    .filter((rule) => SINGLE_LINE.test(rule.userAgent))
    .map((rule) => {
      const allow = rule.allow.filter((p) => SINGLE_LINE.test(p));
      const disallow = groupDisallow(rule.disallow.filter((p) => SINGLE_LINE.test(p)));
      return { userAgent: rule.userAgent, ...(allow.length && { allow }), disallow };
    });
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: FIXED_DISALLOW }, ...adminRules],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
