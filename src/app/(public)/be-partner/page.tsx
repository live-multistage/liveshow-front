import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OrganizersHero } from '@/features/marketing/components/organizers/OrganizersHero';
import { AudienceStrip } from '@/features/marketing/components/organizers/AudienceStrip';
import { HowItWorks } from '@/features/marketing/components/organizers/HowItWorks';
import { TransmissionSection } from '@/features/marketing/components/organizers/TransmissionSection';
import { TicketsSection } from '@/features/marketing/components/organizers/TicketsSection';
import { ChannelsSection } from '@/features/marketing/components/organizers/ChannelsSection';
import { ReplaySection } from '@/features/marketing/components/organizers/ReplaySection';
import { ManagementSection } from '@/features/marketing/components/organizers/ManagementSection';
import { PaymentSection } from '@/features/marketing/components/organizers/PaymentSection';
import { FaqSection } from '@/features/marketing/components/organizers/FaqSection';
import { FinalCta } from '@/features/marketing/components/organizers/FinalCta';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('organizersPage');
  const title = t('meta.title');
  const description = t('meta.description');
  return {
    title,
    description,
    alternates: { canonical: '/be-partner' },
    openGraph: { type: 'website', url: '/be-partner', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function OrganizersLandingPage() {
  return (
    <main className={styles.page}>
      <OrganizersHero />
      <AudienceStrip />
      <HowItWorks />
      <TransmissionSection />
      <TicketsSection />
      <ChannelsSection />
      <ReplaySection />
      <ManagementSection />
      <PaymentSection />
      <FaqSection />
      <FinalCta />
    </main>
  );
}
