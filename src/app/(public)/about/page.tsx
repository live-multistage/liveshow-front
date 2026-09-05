import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AboutPageContent } from '@/features/marketing/components/about/AboutPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('aboutPage');
  const title = t('meta.title');
  const manifesto = t.raw('hero.manifesto') as string[];
  const description = manifesto[0];
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: { type: 'website', url: '/about', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function AboutPage() {
  return <AboutPageContent />;
}
