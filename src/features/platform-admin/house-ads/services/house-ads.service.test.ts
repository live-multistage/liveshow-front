import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/http/client', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

import { httpClient } from '@/lib/http/client';
import { houseAdsService } from './house-ads.service';
import type { CreateHouseAdRequest } from '../types/house-ads.types';

describe('houseAdsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list() GETs the collection with status/priority/page/limit params', async () => {
    await houseAdsService.list({ status: 'ACTIVE', priority: 'PRIORITY', page: 2, limit: 10 });

    expect(httpClient.get).toHaveBeenCalledWith('/platform-admin/house-ads', {
      params: { status: 'ACTIVE', priority: 'PRIORITY', page: 2, limit: 10 },
    });
  });

  it('create() POSTs the payload to the collection', async () => {
    const payload: CreateHouseAdRequest = {
      title: 'Show it off',
      format: 'HORIZONTAL_728x90',
      placements: ['FEED'],
      targetDomains: [],
      targetCategories: [],
      housePriority: 'FILL',
      startsAt: '2026-10-01T00:00:00.000Z',
      endsAt: '2026-10-31T00:00:00.000Z',
    };

    await houseAdsService.create(payload);

    expect(httpClient.post).toHaveBeenCalledWith('/platform-admin/house-ads', payload);
  });

  it('update() PATCHes the ad by id with only the given fields', async () => {
    await houseAdsService.update('ad-1', { title: 'New title' });

    expect(httpClient.patch).toHaveBeenCalledWith('/platform-admin/house-ads/ad-1', { title: 'New title' });
  });

  it('uploadBanner() sends the file as multipart FormData under "file"', async () => {
    const file = new File(['x'], 'banner.png', { type: 'image/png' });

    await houseAdsService.uploadBanner('ad-1', file);

    expect(httpClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = vi.mocked(httpClient.post).mock.calls[0];
    expect(url).toBe('/platform-admin/house-ads/ad-1/banner');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('uploadVideo() sends the file as multipart FormData under "file"', async () => {
    const file = new File(['x'], 'ad.mp4', { type: 'video/mp4' });

    await houseAdsService.uploadVideo('ad-1', file);

    expect(httpClient.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = vi.mocked(httpClient.post).mock.calls[0];
    expect(url).toBe('/platform-admin/house-ads/ad-1/video');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it.each(['publish', 'pause', 'resume', 'end'] as const)('changeStatus() POSTs %s as an action-scoped route', async (action) => {
    await houseAdsService.changeStatus('ad-1', action);

    expect(httpClient.post).toHaveBeenCalledWith(`/platform-admin/house-ads/ad-1/${action}`);
  });

  it('getReport() GETs the report for the ad id', async () => {
    await houseAdsService.getReport('ad-1');

    expect(httpClient.get).toHaveBeenCalledWith('/platform-admin/house-ads/ad-1/report');
  });
});
