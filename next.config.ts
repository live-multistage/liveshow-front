import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // The og-image routes read the Archivo woff files from disk at request time
  // (Node runtime, see src/shared/og/fonts.ts); make sure every function
  // bundle ships them regardless of how well the tracer follows the readFile.
  outputFileTracingIncludes: {
    '/**': ['./src/shared/og/fonts/**/*'],
  },
  transpilePackages: [
    '@live-show/analytics-sdk',
    '@live-show/api-contracts',
    '@live-show/design-system',
    '@live-show/i18n-messages',
  ],
  // sass-loader can drive the native sass-embedded binary instead of the JS
  // `sass` package — same output, much faster compiles for our 300+ SCSS
  // modules. Webpack-only: Turbopack (next dev --turbopack) has its own Sass
  // pipeline and does not read `sassOptions` at all, so this only affects
  // `next build` and the `dev:webpack` fallback script.
  sassOptions: {
    implementation: 'sass-embedded',
  },
  experimental: {
    // Rewrites named imports from this barrel to their direct module paths,
    // shrinking the module graph pulled in per page. lucide-react is already
    // in Next's own default optimizePackageImports list (verified in
    // node_modules/next/dist/server/config.js), so it isn't repeated here.
    // Our own `src/features/*/index.ts` barrels are local path aliases, not
    // resolvable npm packages, which is what this option is documented and
    // built to target — left out rather than guessing it applies to them too.
    optimizePackageImports: ['@live-show/design-system'],
    // The default merges CSS of modules shared by many routes into one ~100KB
    // file (chat, admin dashboards, player…) that every public page then
    // render-blocks on. One CSS file per JS chunk ships only what the route
    // uses: home went from ~214KB to ~73KB of CSS in a local build.
    cssChunking: false,
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
    // Upload origins answer `max-age=0`, which would cap the optimizer cache
    // at Next's 60s default and re-encode the hero on nearly every visit.
    // Upload paths are content-unique (uuid filenames), so a long TTL is safe.
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
      // Production upload origin (next/image 400s on any host not listed here).
      {
        protocol: 'https',
        hostname: 'api.showon.io',
        pathname: '/uploads/**',
      },
      // Bunny CDN edge that fronts media in production (MEDIA_CDN_BASE_URL).
      {
        protocol: 'https',
        hostname: 'showon.b-cdn.net',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
