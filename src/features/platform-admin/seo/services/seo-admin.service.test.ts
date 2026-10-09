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

  it('uploadOgImage posts multipart FormData with field "file"', async () => {
    post.mockResolvedValueOnce({ data: { key: 'k', url: 'u', width: 1200, height: 630 } });
    const file = new File(['x'], 'og.png', { type: 'image/png' });
    const res = await seoAdminService.uploadOgImage(file);
    expect(res.key).toBe('k');
    expect(post.mock.calls[0][0]).toBe('/platform/seo/og-image');
    expect((post.mock.calls[0][1] as FormData).get('file')).toBe(file);
    expect(post.mock.calls[0][2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
});
