import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { seriesService } from './series.service';
import type { SeriesDetail, SeriesListItem } from '../types/series.types';

const LIST_ITEM: SeriesListItem = {
  id: 'series-1',
  organizationId: 'org-1',
  slug: 'quinta-do-rock',
  name: 'Quinta do Rock',
  description: null,
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  dtstart: '2026-01-01T23:00:00.000Z',
  timezone: 'America/Sao_Paulo',
  durationMin: 90,
  horizonWeeks: 4,
  templateEventId: 'evt-template-1',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextEpisode: null,
};

const DETAIL: SeriesDetail = {
  ...LIST_ITEM,
  upcoming: [],
  replays: [],
  seasonPasses: [],
};

describe('seriesService', () => {
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
    it('reads from /series', async () => {
      const seen = capture([LIST_ITEM]);

      await seriesService.list();

      expect(seen[0].url).toBe('/series');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the items as given', async () => {
      capture([LIST_ITEM]);

      await expect(seriesService.list()).resolves.toEqual([LIST_ITEM]);
    });
  });

  describe('getBySlug', () => {
    it('reads from /series/:slug', async () => {
      const seen = capture(DETAIL);

      await seriesService.getBySlug('quinta-do-rock');

      expect(seen[0].url).toBe('/series/quinta-do-rock');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the series detail as given', async () => {
      capture(DETAIL);

      await expect(seriesService.getBySlug('quinta-do-rock')).resolves.toEqual(DETAIL);
    });
  });
});
