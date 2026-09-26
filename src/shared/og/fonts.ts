import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Archivo (OFL) bundled for the og-image routes: satori can't use the page's
// Google Fonts <link>, it needs raw font data. The routes run on the Node
// runtime (the edge bundle blew past Vercel's 1 MB limit once next-intl's
// three locale catalogs were inlined), so the files are read from disk once
// per instance; `join(process.cwd(), '<literal>')` is what Next's file tracer
// follows to ship them with the function.
type OgFont = { name: string; data: Buffer; weight: 400 | 800; style: 'normal' };

const FONT_DIR = join(process.cwd(), 'src/shared/og/fonts');

let cached: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  cached = Promise.all([
    readFile(join(FONT_DIR, 'Archivo-400.woff')),
    readFile(join(FONT_DIR, 'Archivo-800.woff')),
  ]).then(([regular, bold]) => [
    { name: 'Archivo', data: regular, weight: 400, style: 'normal' },
    { name: 'Archivo', data: bold, weight: 800, style: 'normal' },
  ]);
  return cached;
}
