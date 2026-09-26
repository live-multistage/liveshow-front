import { getTranslations } from 'next-intl/server';
import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'nodejs';
export const alt = 'Política de Privacidade — showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const t = await getTranslations('legal.privacy');
  return renderBrandCard({
    eyebrow: 'PRIVACIDADE',
    title: t('title'),
    subtitle: t('intro'),
    badge: 'LEGAL',
  });
}
