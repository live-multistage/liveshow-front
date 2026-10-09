import type { MetadataRoute } from 'next';
import type { SeoRobotsRule } from '@live-show/api-contracts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

export const FIXED_DISALLOW = [
  '/api/', '/dashboard/', '/broadcaster-dock/', '/checkin/', '/login', '/register', '/forgot-password',
  '/reset-password', '/checkout', '/cart', '/account/', '/settings/', '/tickets/', '/purchases/',
  '/my-list/', '/wishlist/', '/notifications/', '/live/', '/watch/', '/replay/',
];

const SINGLE_LINE = /^[^\r\n]+$/;

// Code rules first and immutable; admin rules only add groups after them.
export function buildRobots(extra: SeoRobotsRule[]): MetadataRoute.Robots {
  const adminRules = extra
    .filter((rule) => SINGLE_LINE.test(rule.userAgent))
    .map((rule) => {
      const allow = rule.allow.filter((p) => SINGLE_LINE.test(p));
      const disallow = rule.disallow.filter((p) => SINGLE_LINE.test(p));
      return { userAgent: rule.userAgent, ...(allow.length && { allow }), disallow };
    });
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: FIXED_DISALLOW }, ...adminRules],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
