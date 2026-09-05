import { describe, it, expect, vi } from 'vitest';

const MESSAGES: Record<string, string> = {
  'meta.title': 'Para organizadores',
  'meta.description': 'Shows, jogos, conferências, cultos, peças, aulas.',
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => MESSAGES[key] ?? key,
}));

vi.mock('@/features/marketing/components/organizers/OrganizersHero', () => ({ OrganizersHero: () => null }));
vi.mock('@/features/marketing/components/organizers/AudienceStrip', () => ({ AudienceStrip: () => null }));
vi.mock('@/features/marketing/components/organizers/HowItWorks', () => ({ HowItWorks: () => null }));
vi.mock('@/features/marketing/components/organizers/TransmissionSection', () => ({ TransmissionSection: () => null }));
vi.mock('@/features/marketing/components/organizers/TicketsSection', () => ({ TicketsSection: () => null }));
vi.mock('@/features/marketing/components/organizers/ChannelsSection', () => ({ ChannelsSection: () => null }));
vi.mock('@/features/marketing/components/organizers/ReplaySection', () => ({ ReplaySection: () => null }));
vi.mock('@/features/marketing/components/organizers/ManagementSection', () => ({ ManagementSection: () => null }));
vi.mock('@/features/marketing/components/organizers/PaymentSection', () => ({ PaymentSection: () => null }));
vi.mock('@/features/marketing/components/organizers/FaqSection', () => ({ FaqSection: () => null }));
vi.mock('@/features/marketing/components/organizers/FinalCta', () => ({ FinalCta: () => null }));

import { generateMetadata } from './page';

describe('/be-partner metadata', () => {
  it('sets matching openGraph and twitter metadata', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe(MESSAGES['meta.title']);
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph?.url).toBe('/be-partner');
    expect(meta.twitter && 'card' in meta.twitter && meta.twitter.card).toBe('summary_large_image');
  });
});
