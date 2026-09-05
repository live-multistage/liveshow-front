import { getTranslations } from 'next-intl/server';
import { renderBrandCard, OG_SIZE } from '@/shared/og/BrandCard';

export const runtime = 'edge';
export const alt = 'Para organizadores no showon.io';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const t = await getTranslations('organizersPage');
  return renderBrandCard({
    eyebrow: t('hero.label'),
    title: `${t('hero.title')} ${t('hero.titleAccent')}`,
    subtitle: t('meta.description'),
  });
}
