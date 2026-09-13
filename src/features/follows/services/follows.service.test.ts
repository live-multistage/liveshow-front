import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { followsService } from './follows.service';
import type { FollowItem } from '@live-show/api-contracts';

const ITEM: FollowItem = {
  id: 'f-1',
  targetType: 'ARTIST',
  targetId: 'artist-1',
  name: 'Some Artist',
  slug: 'some-artist',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('followsService', () => {
  const originalAdapter = httpClient.defaults.adapter;
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  function capture(payload: unknown = {}) {
    const seen: AxiosRequestConfig[] = [];
    httpClient.defaults.adapter = (async (config) => {
      seen.push(config);
      return { data: payload, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    return seen;
  }

  describe('list', () => {
    it('reads from /me/follows with targetType', async () => {
      const seen = capture({ items: [ITEM] });

      const result = await followsService.list('ARTIST');

      expect(seen[0].url).toBe('/me/follows');
      expect(seen[0].method?.toLowerCase()).toBe('get');
      expect(seen[0].params).toEqual({ targetType: 'ARTIST' });
      expect(result).toEqual([ITEM]);
    });
  });

  describe('listIds', () => {
    it('reads from /me/follows/ids with targetType', async () => {
      const seen = capture({ ids: ['artist-1'] });

      const result = await followsService.listIds('ARTIST');

      expect(seen[0].url).toBe('/me/follows/ids');
      expect(seen[0].params).toEqual({ targetType: 'ARTIST' });
      expect(result).toEqual(['artist-1']);
    });
  });

  describe('follow', () => {
    it('posts targetType and targetId to /me/follows', async () => {
      const seen = capture({ following: true });

      await followsService.follow('ARTIST', 'artist-1');

      expect(seen[0].url).toBe('/me/follows');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual({
        targetType: 'ARTIST',
        targetId: 'artist-1',
      });
    });
  });

  describe('unfollow', () => {
    it('deletes /me/follows/:targetType/:targetId', async () => {
      const seen = capture(undefined);

      await followsService.unfollow('ORGANIZATION', 'org-1');

      expect(seen[0].url).toBe('/me/follows/ORGANIZATION/org-1');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });

  describe('count', () => {
    it('reads from /follows/:targetType/:targetId/count', async () => {
      const seen = capture({ count: 7 });

      const result = await followsService.count('ARTIST', 'artist-1');

      expect(seen[0].url).toBe('/follows/ARTIST/artist-1/count');
      expect(seen[0].method?.toLowerCase()).toBe('get');
      expect(result).toBe(7);
    });
  });
});
