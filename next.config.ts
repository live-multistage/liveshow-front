import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@live-show/api-contracts', '@live-show/design-system', '@live-show/i18n-messages'],
  // Counters the tsconfig `paths.react` shim (added to unify @types/react for
  // tsc, see docs re: pnpm's phantom `.pnpm/node_modules/@types/react` hoist)
  // which Next's webpack would otherwise also apply, pointing the real
  // `react` import at a types-only folder. Keep both changes together.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    };
    return config;
  },
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
        protocol: 'https',
        hostname: 'picsum.photos',
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
