import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@live-show/design-system'],
  // Same-origin proxy for LAN clients (phone on https://192.168.x.x:3000):
  // their browser calls /api/* here and the dev server forwards to the local
  // backend — sidesteps both "localhost is the phone" and mixed-content
  // blocking. Desktop on localhost bypasses this entirely (see src/config).
  async rewrites() {
    const target = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
