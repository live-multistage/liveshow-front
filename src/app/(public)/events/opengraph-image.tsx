import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Shows no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    eyebrow: 'PROGRAMAÇÃO',
    title: 'Shows',
    subtitle: 'Todos os shows, eventos e transmissões ao vivo disponíveis no showon.io.',
  });
}
