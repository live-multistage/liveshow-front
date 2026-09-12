import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // See tsconfig.json — node_modules/@live-show/api-contracts is a
      // symlink shared with the main worktree and still resolves to its
      // (stale, pre-p1/contracts) shared/api-contracts. Point vitest at the
      // copy actually checked out in this worktree instead.
      '@live-show/api-contracts': fileURLToPath(new URL('./shared/api-contracts/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
