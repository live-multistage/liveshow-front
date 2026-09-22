import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireFeatureFlag } from '@/features/feature-flags';
import { AdvertisersHero } from '@/features/marketing/components/advertisers/AdvertisersHero';
import { AudienceStrip } from '@/features/marketing/components/advertisers/AudienceStrip';
import { PositionsSection } from '@/features/marketing/components/advertisers/PositionsSection';
import { FormatsSection } from '@/features/marketing/components/advertisers/FormatsSection';
import { HowItWorks } from '@/features/marketing/components/advertisers/HowItWorks';
import { TargetingSection } from '@/features/marketing/components/advertisers/TargetingSection';
import { PricingSection } from '@/features/marketing/components/advertisers/PricingSection';
import { ReportsSection } from '@/features/marketing/components/advertisers/ReportsSection';
import { SecurityTeamSection } from '@/features/marketing/components/advertisers/SecurityTeamSection';
import { OrganizerCrossSection } from '@/features/marketing/components/advertisers/OrganizerCrossSection';
import { FaqSection } from '@/features/marketing/components/advertisers/FaqSection';
import { FinalCta } from '@/features/marketing/components/advertisers/FinalCta';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  // requireFeatureFlag itself 404s; fetchFeatureFlags underneath is
  // request-memoised, so the page component's own call below is free.
  await requireFeatureFlag('advertiser_platform');
  const t = await getTranslations('advertisersPage');
  const title = t('meta.title');
  const description = t('meta.description');
  return {
    title,
    description,
    alternates: { canonical: '/be-advertiser' },
    openGraph: { type: 'website', url: '/be-advertiser', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function AdvertisersLandingPage() {
  await requireFeatureFlag('advertiser_platform');
  return (
    <main className={styles.page}>
      <AdvertisersHero />
      <AudienceStrip />
      <PositionsSection />
      <FormatsSection />
      <HowItWorks />
      <TargetingSection />
      <PricingSection />
      <ReportsSection />
      <SecurityTeamSection />
      <OrganizerCrossSection />
      <FaqSection />
      <FinalCta />
    </main>
  );
}
