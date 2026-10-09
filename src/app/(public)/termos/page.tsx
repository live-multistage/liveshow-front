import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { LegalDocumentPage } from '@/features/legal';
import { fetchLegalDocument } from '@/features/legal/queries/get-legal-document.server';
import { firstParagraph } from '@/features/legal/utils/first-paragraph';
import { pickLocaleContent } from '@/features/legal/utils/pick-locale-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.ui');
  const title = t('termsTitle');
  const doc = await fetchLegalDocument('terms');
  const description = doc ? firstParagraph(pickLocaleContent(doc.content, await getLocale())) || undefined : undefined;
  return {
    title,
    description,
    alternates: { canonical: '/termos' },
    openGraph: { type: 'website', url: '/termos', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TermsOfUsePage() {
  return <LegalDocumentPage kind="terms" doc={await fetchLegalDocument('terms')} isCurrent />;
}
