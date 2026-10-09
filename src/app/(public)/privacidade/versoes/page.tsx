import type { Metadata } from 'next';
import { LegalVersionList } from '@/features/legal';
import { fetchLegalVersions } from '@/features/legal/queries/get-legal-document.server';

export const metadata: Metadata = { robots: { index: false, follow: true }, alternates: { canonical: '/privacidade' } };

export default async function PrivacyPolicyPageVersions() {
  return <LegalVersionList kind="privacy" versions={await fetchLegalVersions('privacy')} />;
}
