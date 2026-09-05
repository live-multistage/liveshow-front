import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Artistas no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    eyebrow: 'ARTISTAS',
    title: 'Artistas',
    subtitle: 'Descubra os artistas e atrações que transmitem ao vivo no showon.io.',
  });
}
