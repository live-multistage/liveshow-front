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
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nextEpisode: null,
  episodeCount: 0,
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

  describe('org management routes', () => {
    it('lists org series from /organizations/:organizationId/series', async () => {
      const seen = capture([LIST_ITEM]);

      await seriesService.listByOrg('org-1');

      expect(seen[0].url).toBe('/organizations/org-1/series');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('creates a series with POST /series', async () => {
      const seen = capture(LIST_ITEM);

      await seriesService.create({
        organizationId: 'org-1',
        slug: 'quinta-do-rock',
        name: 'Quinta do Rock',
        rrule: 'FREQ=WEEKLY;BYDAY=TH',
        dtstart: '2026-01-01T23:00:00.000Z',
        timezone: 'America/Sao_Paulo',
        durationMin: 90,
        horizonWeeks: 4,
      });

      expect(seen[0].url).toBe('/series');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });

    it('updates a series with PATCH /series/:id', async () => {
      const seen = capture(LIST_ITEM);

      await seriesService.update('series-1', { name: 'Novo nome' });

      expect(seen[0].url).toBe('/series/series-1');
      expect(seen[0].method?.toLowerCase()).toBe('patch');
    });

    it.each(['pause', 'resume', 'end', 'materialize'] as const)(
      'calls POST /series/:id/%s for %s()',
      async (action) => {
        const seen = capture(LIST_ITEM);

        await seriesService[action]('series-1');

        expect(seen[0].url).toBe(`/series/series-1/${action}`);
        expect(seen[0].method?.toLowerCase()).toBe('post');
      },
    );

    it('lists episodes from /series/:id/episodes', async () => {
      const seen = capture([]);

      await seriesService.listEpisodes('series-1');

      expect(seen[0].url).toBe('/series/series-1/episodes');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('reattaches an episode with POST /series/:id/episodes/:eventId/reattach', async () => {
      const seen = capture({});

      await seriesService.reattachEpisode('series-1', 'evt-1');

      expect(seen[0].url).toBe('/series/series-1/episodes/evt-1/reattach');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });

    it('lists ticket products from /series/:id/ticket-products', async () => {
      const seen = capture([]);

      await seriesService.listTicketProducts('series-1');

      expect(seen[0].url).toBe('/series/series-1/ticket-products');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('creates a ticket product with POST /series/:id/ticket-products', async () => {
      const seen = capture({});

      await seriesService.createTicketProduct('series-1', {
        name: 'Passe',
        description: 'Passe da temporada',
        price: 100,
        currency: 'BRL',
        capabilities: ['LIVE_VIEW'],
      });

      expect(seen[0].url).toBe('/series/series-1/ticket-products');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });

    it('updates a ticket product with PATCH /series/:id/ticket-products/:productId', async () => {
      const seen = capture({});

      await seriesService.updateTicketProduct('series-1', 'prod-1', {
        name: 'Passe',
        description: 'Passe da temporada',
        price: 100,
        currency: 'BRL',
        capabilities: ['LIVE_VIEW'],
      });

      expect(seen[0].url).toBe('/series/series-1/ticket-products/prod-1');
      expect(seen[0].method?.toLowerCase()).toBe('patch');
    });

    it('deletes a ticket product with DELETE /series/:id/ticket-products/:productId', async () => {
      const seen = capture(undefined);

      await seriesService.deleteTicketProduct('series-1', 'prod-1');

      expect(seen[0].url).toBe('/series/series-1/ticket-products/prod-1');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });
});
