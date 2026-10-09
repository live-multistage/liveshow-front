import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { LegalDocumentPage } from '@/features/legal';
import { fetchLegalDocument } from '@/features/legal/queries/get-legal-document.server';
import { firstParagraph } from '@/features/legal/utils/first-paragraph';
import { pickLocaleContent } from '@/features/legal/utils/pick-locale-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.ui');
  const title = t('privacyTitle');
  const doc = await fetchLegalDocument('privacy');
  const description = doc ? firstParagraph(pickLocaleContent(doc.content, await getLocale())) || undefined : undefined;
  return {
    title,
    description,
    alternates: { canonical: '/privacidade' },
    openGraph: { type: 'website', url: '/privacidade', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PrivacyPolicyPage() {
  return <LegalDocumentPage kind="privacy" doc={await fetchLegalDocument('privacy')} isCurrent />;
}
