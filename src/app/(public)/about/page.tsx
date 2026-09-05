import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AboutPageContent } from '@/features/marketing/components/about/AboutPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('aboutPage');
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { canonical: '/about' },
  };
}

export default function AboutPage() {
  return <AboutPageContent />;
}
