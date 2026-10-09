import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentPage } from '@/features/legal';
import { fetchLegalDocument, fetchLegalVersion } from '@/features/legal/queries/get-legal-document.server';

interface Props {
  params: Promise<{ version: string }>;
}

// Old versions are evidence, not content: keep them out of the index and point at the current page.
export const metadata: Metadata = { robots: { index: false, follow: true }, alternates: { canonical: '/termos' } };

export default async function TermsOfUsePageVersion({ params }: Props) {
  const version = Number((await params).version);
  if (!Number.isInteger(version) || version < 1) notFound();
  const [doc, current] = await Promise.all([fetchLegalVersion('terms', version), fetchLegalDocument('terms')]);
  if (!doc) notFound();
  return <LegalDocumentPage kind="terms" doc={doc} isCurrent={current?.version === doc.version} />;
}
