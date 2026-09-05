// Archivo (OFL) bundled for the edge og-image routes: satori can't use the
// page's Google Fonts <link>, it needs raw font data. Fetched once per
// isolate via import.meta.url so the files ship with the edge bundle.
type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' };

let cached: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  cached = Promise.all([
    fetch(new URL('./fonts/Archivo-400.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('./fonts/Archivo-800.woff', import.meta.url)).then((r) => r.arrayBuffer()),
  ]).then(([regular, bold]) => [
    { name: 'Archivo', data: regular, weight: 400, style: 'normal' },
    { name: 'Archivo', data: bold, weight: 800, style: 'normal' },
  ]);
  return cached;
}
