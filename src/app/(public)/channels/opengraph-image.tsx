import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Canais no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    eyebrow: 'CANAIS',
    title: 'Canais',
    subtitle: 'Canais 24h ao vivo — programação contínua de shows e eventos no showon.io.',
  });
}
