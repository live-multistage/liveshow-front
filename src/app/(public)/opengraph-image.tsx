import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'nodejs';
export const alt = 'showon.io — eventos ao vivo de todo o mundo, na palma da sua mão.';
export const size = OG_SIZE;
export const contentType = 'image/png';

// The home page sets its own `openGraph`, which replaces the root layout's whole
// object (Next merges metadata shallowly) and drops app/opengraph-image's image.
export default function OpengraphImage() {
  return renderBrandCard({
    title: 'Eventos ao vivo de todo o mundo',
    subtitle: 'na palma da sua mão.',
  });
}
