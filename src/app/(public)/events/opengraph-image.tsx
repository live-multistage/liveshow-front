import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'nodejs';
export const alt = 'Programação do showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    eyebrow: 'PROGRAMAÇÃO',
    title: 'Programação',
    subtitle: 'Todos os eventos e transmissões ao vivo disponíveis no showon.io.',
  });
}
