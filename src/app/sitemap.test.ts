import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.mock('@/features/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/feature-flags')>();
  return { ...actual, fetchFeatureFlags: vi.fn() };
});

import { fetchFeatureFlags, DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';
import sitemap from './sitemap';

const mockedFetchFlags = vi.mocked(fetchFeatureFlags);
const originalFetch = global.fetch;

beforeEach(() => {
  // fetchAllEvents/fetchList/fetchArtists all hit fetch() directly; fail the
  // network so they fall back to their static/empty defaults and this test
  // stays focused on the advertiser_platform gating.
  global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in test'));
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('sitemap', () => {
  it('includes /be-advertiser when advertiser_platform is on', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, advertiser_platform: true });
    const entries = await sitemap();
    expect(entries.some((e) => e.url.endsWith('/be-advertiser'))).toBe(true);
  });

  it('excludes /be-advertiser when advertiser_platform is off', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, advertiser_platform: false });
    const entries = await sitemap();
    expect(entries.some((e) => e.url.endsWith('/be-advertiser'))).toBe(false);
  });
});
