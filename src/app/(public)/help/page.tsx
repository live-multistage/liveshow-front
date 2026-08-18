import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HelpPageContent } from '@/features/help';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('help');
  return { title: t('metaTitle'), description: t('subtitle') };
}

export default function HelpPage() {
  return <HelpPageContent />;
}
