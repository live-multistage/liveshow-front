import { getTranslations } from 'next-intl/server';
import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Central de ajuda — showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const t = await getTranslations('help');
  return renderBrandCard({
    eyebrow: 'AJUDA',
    title: t('metaTitle'),
    subtitle: t('subtitle'),
  });
}
