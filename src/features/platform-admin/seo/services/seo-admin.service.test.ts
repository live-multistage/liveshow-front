import { beforeEach, describe, expect, it, vi } from 'vitest';

const put = vi.fn().mockResolvedValue({ data: {} });
const post = vi.fn().mockResolvedValue({ data: {} });
vi.mock('@/lib/http/client', () => ({ httpClient: { put: (...a: unknown[]) => put(...a), post: (...a: unknown[]) => post(...a) } }));

import { seoAdminService } from './seo-admin.service';

const fields = {
  titleTemplate: 't',
  descriptionTemplate: null,
  ogImageUrl: null,
  keywords: null, ogTitle: null, ogDescription: null, twitterTitle: null, twitterDescription: null, canonicalUrl: null, locale: null, jsonLdMode: null,
  robotsIndex: true,
  robotsFollow: null,
  disabledGeneratedJsonLd: [],
  extraJsonLd: [],
};
const FIELD_KEYS = Object.keys(fields).sort();

describe('seoAdminService request bodies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setTemplate sends exactly the SeoFields keys even when given extra props', async () => {
    const withExtras = { ...fields, pageKey: 'home', updatedAt: 'x', id: 'i', path: '/p' };
    await seoAdminService.setTemplate('home', withExtras as never);
    expect(put).toHaveBeenCalledWith('/platform/seo/templates/home', expect.any(Object));
    expect(Object.keys(put.mock.calls[0][1]).sort()).toEqual(FIELD_KEYS);
  });

  it('createOverride sends path plus SeoFields only', async () => {
    await seoAdminService.createOverride({ ...fields, path: '/a', id: 'i', pageKey: 'home' } as never);
    expect(Object.keys(post.mock.calls[0][1]).sort()).toEqual([...FIELD_KEYS, 'path'].sort());
  });

  it('updateOverride sends path plus SeoFields only', async () => {
    await seoAdminService.updateOverride('9', { ...fields, path: '/a', updatedAt: 'x' } as never);
    expect(put.mock.calls[0][0]).toBe('/platform/seo/overrides/9');
    expect(Object.keys(put.mock.calls[0][1]).sort()).toEqual([...FIELD_KEYS, 'path'].sort());
  });
});
