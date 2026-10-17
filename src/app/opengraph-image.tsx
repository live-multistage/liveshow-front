import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'nodejs';
export const alt = 'showon.io — eventos ao vivo de todo o mundo, na palma da sua mão.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    title: 'Eventos ao vivo de todo o mundo',
    subtitle: 'na palma da sua mão.',
  });
}
