import type { Metadata } from 'next';
import { applySeo, getSeoForPage } from '@/features/seo';
import { getTranslations } from 'next-intl/server';
import { HelpPageContent } from '@/features/help';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('help');
  const title = t('metaTitle');
  const description = t('subtitle');
  const base: Metadata = {
    title,
    description,
    alternates: { canonical: '/help' },
    openGraph: { type: 'website', url: '/help', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
  return applySeo(base, await getSeoForPage('help', '/help'), {});
}

export default function HelpPage() {
  return <HelpPageContent />;
}
