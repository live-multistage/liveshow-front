import type { Metadata } from 'next';
import { LegalVersionList } from '@/features/legal';
import { fetchLegalVersions } from '@/features/legal/queries/get-legal-document.server';

export const metadata: Metadata = { robots: { index: false, follow: true }, alternates: { canonical: '/termos' } };

export default async function TermsOfUsePageVersions() {
  return <LegalVersionList kind="terms" versions={await fetchLegalVersions('terms')} />;
}
