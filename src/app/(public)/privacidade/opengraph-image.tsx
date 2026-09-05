import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Política de Privacidade — showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderBrandCard({
    eyebrow: 'PRIVACIDADE',
    title: 'Política de Privacidade',
    subtitle: 'Como o showon.io coleta, usa e protege seus dados, em conformidade com a LGPD.',
    badge: 'LEGAL',
  });
}
