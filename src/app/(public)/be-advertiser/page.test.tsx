import { describe, it, expect, vi, beforeEach } from 'vitest';

const MESSAGES: Record<string, string> = {
  'meta.title': 'Anuncie na showon.io',
  'meta.description': 'Coloque sua marca nos shows ao vivo e replays da showon.io.',
};

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => MESSAGES[key] ?? key,
}));

vi.mock('@/features/feature-flags', () => ({ requireFeatureFlag: vi.fn() }));

vi.mock('@/features/marketing/components/advertisers/AdvertisersHero', () => ({ AdvertisersHero: () => null }));
vi.mock('@/features/marketing/components/advertisers/AudienceStrip', () => ({ AudienceStrip: () => null }));
vi.mock('@/features/marketing/components/advertisers/PositionsSection', () => ({ PositionsSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/FormatsSection', () => ({ FormatsSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/HowItWorks', () => ({ HowItWorks: () => null }));
vi.mock('@/features/marketing/components/advertisers/TargetingSection', () => ({ TargetingSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/PricingSection', () => ({ PricingSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/ReportsSection', () => ({ ReportsSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/SecurityTeamSection', () => ({ SecurityTeamSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/OrganizerCrossSection', () => ({ OrganizerCrossSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/FaqSection', () => ({ FaqSection: () => null }));
vi.mock('@/features/marketing/components/advertisers/FinalCta', () => ({ FinalCta: () => null }));

import { generateMetadata, default as AdvertisersLandingPage } from './page';
import { requireFeatureFlag } from '@/features/feature-flags';

const mockedRequireFlag = vi.mocked(requireFeatureFlag);

describe('/be-advertiser metadata', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets matching openGraph and twitter metadata with the /be-advertiser canonical', async () => {
    const meta = await generateMetadata();

    expect(meta.title).toBe(MESSAGES['meta.title']);
    expect(meta.alternates?.canonical).toBe('/be-advertiser');
    expect(meta.openGraph?.title).toBe(meta.title);
    expect(meta.openGraph?.url).toBe('/be-advertiser');
    expect(meta.twitter && 'card' in meta.twitter && meta.twitter.card).toBe('summary_large_image');
  });

  it('404s the metadata when advertiser_platform is off', async () => {
    mockedRequireFlag.mockRejectedValueOnce(new Error('NEXT_NOT_FOUND'));
    await expect(generateMetadata()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('/be-advertiser page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders when advertiser_platform is on', async () => {
    mockedRequireFlag.mockResolvedValue(undefined as never);
    await expect(AdvertisersLandingPage()).resolves.toBeTruthy();
  });

  it('404s when advertiser_platform is off', async () => {
    mockedRequireFlag.mockRejectedValueOnce(new Error('NEXT_NOT_FOUND'));
    await expect(AdvertisersLandingPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
