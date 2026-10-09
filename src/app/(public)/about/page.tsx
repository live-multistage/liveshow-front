import type { Metadata } from 'next';
import { applySeo, getSeoForPage } from '@/features/seo';
import { PageJsonLd } from '@/features/seo/components/PageJsonLd';
import { getTranslations } from 'next-intl/server';
import { AboutPageContent } from '@/features/marketing/components/about/AboutPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('aboutPage');
  const title = t('meta.title');
  const manifesto = t.raw('hero.manifesto') as string[];
  const description = manifesto[0];
  const base: Metadata = {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: { type: 'website', url: '/about', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
  return applySeo(base, await getSeoForPage('about', '/about'), {});
}

export default function AboutPage() {
  return (
    <>
      <AboutPageContent />
      <PageJsonLd pageKey="about" path="/about" />
    </>
  );
}
