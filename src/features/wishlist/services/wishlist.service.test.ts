import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { wishlistService } from './wishlist.service';
import type { WishlistItem } from '../types/wishlist.types';

const ITEM: WishlistItem = {
  id: 'ev-1',
  title: 'Show',
  status: 'LIVE',
  startsAt: '2026-01-01T20:00:00.000Z',
  endsAt: '2026-01-01T22:00:00.000Z',
  thumbnailUrl: null,
  bannerUrl: null,
  venue: null,
  city: null,
  savedAt: '2026-01-01T10:00:00.000Z',
};

describe('wishlistService', () => {
  const originalAdapter = httpClient.defaults.adapter;
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  function capture(payload: unknown = []) {
    const seen: AxiosRequestConfig[] = [];
    httpClient.defaults.adapter = (async (config) => {
      seen.push(config);
      return { data: payload, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    return seen;
  }

  describe('list', () => {
    it('reads from /me/wishlist', async () => {
      const seen = capture([ITEM]);

      await wishlistService.list();

      expect(seen[0].url).toBe('/me/wishlist');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the items as given', async () => {
      capture([ITEM]);

      await expect(wishlistService.list()).resolves.toEqual([ITEM]);
    });
  });

  describe('listIds', () => {
    it('reads from /me/wishlist/ids', async () => {
      const seen = capture(['ev-1', 'ev-2']);

      await wishlistService.listIds();

      expect(seen[0].url).toBe('/me/wishlist/ids');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the ids as given', async () => {
      capture(['ev-1']);

      await expect(wishlistService.listIds()).resolves.toEqual(['ev-1']);
    });
  });

  describe('add', () => {
    it('posts the eventId to /me/wishlist', async () => {
      const seen = capture(undefined);

      await wishlistService.add('ev-1');

      expect(seen[0].url).toBe('/me/wishlist');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual({ eventId: 'ev-1' });
    });
  });

  describe('remove', () => {
    it('deletes /me/wishlist/:eventId', async () => {
      const seen = capture(undefined);

      await wishlistService.remove('ev-1');

      expect(seen[0].url).toBe('/me/wishlist/ev-1');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });
});
