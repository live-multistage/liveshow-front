import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Archivo (OFL) bundled for the og-image routes: satori can't use the page's
// Google Fonts <link>, it needs raw font data. The routes run on the Node
// runtime (the edge bundle blew past Vercel's 1 MB limit once next-intl's
// three locale catalogs were inlined), so the files are read from disk once
// per instance. The tracer only follows `join(process.cwd(), '<literal>')`
// written out in full at each call site — an intermediate const defeats it
// (ENOENT in production) — and next.config's outputFileTracingIncludes pins
// the directory as a second guarantee.
type OgFont = { name: string; data: Buffer; weight: 400 | 800; style: 'normal' };

let cached: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  cached = Promise.all([
    readFile(join(process.cwd(), 'src/shared/og/fonts/Archivo-400.woff')),
    readFile(join(process.cwd(), 'src/shared/og/fonts/Archivo-800.woff')),
  ]).then(([regular, bold]) => [
    { name: 'Archivo', data: regular, weight: 400, style: 'normal' },
    { name: 'Archivo', data: bold, weight: 800, style: 'normal' },
  ]);
  return cached;
}
