import type { Metadata } from 'next';
import { applySeo, getSeoForPage } from '@/features/seo';
import { PageJsonLd } from '@/features/seo/components/PageJsonLd';
import { requireFeatureFlag } from '@/features/feature-flags';
import { OrganizerApplicationContent } from '@/features/organizations/pages/OrganizerApplicationPage';

const BASE_METADATA: Metadata = {
  title: 'Candidate-se a organizador',
  description: 'Envie sua candidatura para se tornar um organizador e comece a transmitir seus eventos.',
  alternates: { canonical: '/be-partner/apply' },
  robots: { index: false },
};

export async function generateMetadata(): Promise<Metadata> {
  return applySeo(BASE_METADATA, await getSeoForPage('be-partner.apply', '/be-partner/apply'), {});
}

export default async function OrganizerApplicationPage() {
  await requireFeatureFlag('organizer_applications');
  return (
    <>
      <OrganizerApplicationContent />
      <PageJsonLd pageKey="be-partner.apply" path="/be-partner/apply" />
    </>
  );
}
