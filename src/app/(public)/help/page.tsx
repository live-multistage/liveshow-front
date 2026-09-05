import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HelpPageContent } from '@/features/help';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('help');
  const title = t('metaTitle');
  const description = t('subtitle');
  return {
    title,
    description,
    alternates: { canonical: '/help' },
    openGraph: { type: 'website', url: '/help', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function HelpPage() {
  return <HelpPageContent />;
}
