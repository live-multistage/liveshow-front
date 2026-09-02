import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/broadcaster-dock/',
          '/checkin/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/checkout',
          '/cart',
          '/account/',
          '/settings/',
          '/tickets/',
          '/purchases/',
          '/my-list/',
          '/wishlist/',
          '/notifications/',
          '/live/',
          '/watch/',
          '/replay/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
