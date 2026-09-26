import { getTranslations } from 'next-intl/server';
import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'nodejs';
export const alt = 'Termos de Uso — showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const t = await getTranslations('legal.terms');
  return renderBrandCard({
    eyebrow: 'TERMOS',
    title: t('title'),
    subtitle: t('p1'),
    badge: 'LEGAL',
  });
}
