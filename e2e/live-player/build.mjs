import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const stub = (name) => path.join(here, 'stubs', name);

// PLAYER_SRC points the bundle at another checkout's src/, which is how the
// suite is shown to fail against code without the fixes.
export async function buildHarness(playerSrc = path.join(here, '../../src')) {
  await build({
    root: here,
    logLevel: 'warn',
    plugins: [react()],
    resolve: {
      // PLAYER_SRC from another checkout must still share this one's React.
      dedupe: ['react', 'react-dom'],
      alias: [
        { find: /^hls\.js$/, replacement: stub('hls.ts') },
        { find: /^next-intl$/, replacement: stub('next-intl.ts') },
        { find: /^sonner$/, replacement: stub('sonner.ts') },
        { find: '@/lib/analytics/tracking', replacement: stub('tracking.ts') },
        { find: /^@live-show\/design-system$/, replacement: stub('ds.tsx') },
        { find: /^@\/config$/, replacement: stub('config.ts') },
        { find: /^@\//, replacement: `${playerSrc}/` },
      ],
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: { outDir: path.join(here, '.dist'), minify: false, emptyOutDir: true },
  });
}
