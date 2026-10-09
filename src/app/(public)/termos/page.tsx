import type { Metadata } from 'next';
import { applySeo, getSeoForPage } from '@/features/seo';
import { PageJsonLd } from '@/features/seo/components/PageJsonLd';
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
  const base: Metadata = {
    title,
    description,
    alternates: { canonical: '/termos' },
    openGraph: { type: 'website', url: '/termos', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
  return applySeo(base, await getSeoForPage('legal.terms', '/termos'), {});
}

export default async function TermsOfUsePage() {
  return (
    <>
      <LegalDocumentPage kind="terms" doc={await fetchLegalDocument('terms')} isCurrent />
      <PageJsonLd pageKey="legal.terms" path="/termos" />
    </>
  );
}
