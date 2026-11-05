import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.mock('@/features/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/feature-flags')>();
  return { ...actual, fetchFeatureFlags: vi.fn() };
});

vi.mock('@/features/seo/queries/get-seo.server', () => ({
  getSeoNoindex: vi.fn().mockResolvedValue({ paths: [], pageKeys: ['help'] }),
}));

vi.mock('@/features/pages-public/queries/get-public-page.server', () => ({
  fetchPublicPageList: vi.fn().mockResolvedValue([]),
}));

import { fetchFeatureFlags, DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';
import { fetchPublicPageList } from '@/features/pages-public/queries/get-public-page.server';
import sitemap from './sitemap';

const mockedFetchFlags = vi.mocked(fetchFeatureFlags);
const mockedFetchPublicPageList = vi.mocked(fetchPublicPageList);
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

  it('drops pages the admin marked noindex', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS });
    const entries = await sitemap();
    expect(entries.some((e) => e.url.endsWith('/help'))).toBe(false);
  });

  it('lists each published page under /p/<slug> when page_builder is on', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, page_builder: true });
    mockedFetchPublicPageList.mockResolvedValue([
      { slug: 'sobre-nos', updatedAt: '2026-11-01T10:00:00.000Z' },
      { slug: 'regras', updatedAt: '2026-11-02T10:00:00.000Z' },
    ]);
    const entries = await sitemap();
    const pageEntries = entries.filter((e) => e.url.includes('/p/'));
    expect(pageEntries.map((e) => e.url)).toEqual([
      expect.stringMatching(/\/p\/sobre-nos$/),
      expect.stringMatching(/\/p\/regras$/),
    ]);
    expect(pageEntries[0]).toMatchObject({
      changeFrequency: 'weekly',
      priority: 0.6,
      lastModified: new Date('2026-11-01T10:00:00.000Z'),
    });
  });

  it('omits /p/ entries when page_builder is off, even if the list has pages', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, page_builder: false });
    mockedFetchPublicPageList.mockResolvedValue([
      { slug: 'sobre-nos', updatedAt: '2026-11-01T10:00:00.000Z' },
      { slug: 'regras', updatedAt: '2026-11-02T10:00:00.000Z' },
    ]);
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes('/p/'))).toBe(false);
  });

  it('still generates the sitemap without /p/ entries when the pages API returns nothing', async () => {
    mockedFetchFlags.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, page_builder: true });
    mockedFetchPublicPageList.mockResolvedValue([]);
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes('/p/'))).toBe(false);
    expect(entries.some((e) => e.url.endsWith('/events'))).toBe(true);
  });
});
