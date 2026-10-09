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
  const title = t('privacyTitle');
  const doc = await fetchLegalDocument('privacy');
  const description = doc ? firstParagraph(pickLocaleContent(doc.content, await getLocale())) || undefined : undefined;
  const base: Metadata = {
    title,
    description,
    alternates: { canonical: '/privacidade' },
    openGraph: { type: 'website', url: '/privacidade', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
  return applySeo(base, await getSeoForPage('legal.privacy', '/privacidade'), {});
}

export default async function PrivacyPolicyPage() {
  return (
    <>
      <LegalDocumentPage kind="privacy" doc={await fetchLegalDocument('privacy')} isCurrent />
      <PageJsonLd pageKey="legal.privacy" path="/privacidade" />
    </>
  );
}
