import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { channelService } from './channel.service';
import type { Channel, PublicChannel, ChannelListItem, Program, ScheduledSlot } from '../types/channel.types';

const CHANNEL: Channel = {
  id: 'ch-1',
  organizationId: 'org-1',
  slug: 'my-channel',
  name: 'My Channel',
  description: null,
  coverUrl: null,
  accessMode: 'FREE',
  status: 'PUBLISHED',
  broadcastEventId: 'evt-1',
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const PUBLIC_CHANNEL: PublicChannel = {
  ...CHANNEL,
  isOnAir: true,
  current: null,
  next: null,
  today: [],
  pricing: null,
  viewer: null,
  source: { mode: 'own', reason: 'own', event: null },
};

const LIST_ITEM: ChannelListItem = {
  ...CHANNEL,
  isOnAir: false,
  current: null,
  next: null,
};

const SLOT: ScheduledSlot = {
  programId: 'prog-1',
  name: 'Morning show',
  startsAt: '2026-01-01T10:00:00.000Z',
  endsAt: '2026-01-01T11:00:00.000Z',
};

const PROGRAM: Program = {
  id: 'prog-1',
  channelId: 'ch-1',
  name: 'Morning show',
  description: null,
  startTime: '10:00',
  durationMin: 60,
  rrule: 'FREQ=DAILY',
  latencyMode: 'STANDARD',
  recordingEnabled: true,
};

describe('channelService', () => {
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
    it('reads from /channels', async () => {
      const seen = capture([LIST_ITEM]);

      await channelService.list();

      expect(seen[0].url).toBe('/channels');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the items as given', async () => {
      capture([LIST_ITEM]);

      await expect(channelService.list()).resolves.toEqual([LIST_ITEM]);
    });
  });

  describe('getBySlug', () => {
    it('reads from /channels/:slug', async () => {
      const seen = capture(PUBLIC_CHANNEL);

      await channelService.getBySlug('my-channel');

      expect(seen[0].url).toBe('/channels/my-channel');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });
  });

  describe('schedule', () => {
    it('reads from /channels/:slug/schedule with day query', async () => {
      const seen = capture([SLOT]);

      await channelService.schedule('my-channel', '2026-01-01');

      expect(seen[0].url).toBe('/channels/my-channel/schedule');
      expect(seen[0].params).toEqual({ day: '2026-01-01' });
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('omits the day query when not given', async () => {
      const seen = capture([SLOT]);

      await channelService.schedule('my-channel');

      expect(seen[0].url).toBe('/channels/my-channel/schedule');
      expect(seen[0].params).toBeUndefined();
    });
  });

  describe('listByOrg', () => {
    it('reads from /organizations/:orgId/channels', async () => {
      const seen = capture([CHANNEL]);

      await channelService.listByOrg('org-1');

      expect(seen[0].url).toBe('/organizations/org-1/channels');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });
  });

  describe('create', () => {
    it('posts to /channels', async () => {
      const seen = capture(CHANNEL);
      const input = {
        organizationId: 'org-1',
        slug: 'my-channel',
        name: 'My Channel',
        timezone: 'America/Sao_Paulo',
      };

      await channelService.create(input);

      expect(seen[0].url).toBe('/channels');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual(input);
    });
  });

  describe('update', () => {
    it('patches /channels/:id', async () => {
      const seen = capture(CHANNEL);

      await channelService.update('ch-1', { name: 'New name' });

      expect(seen[0].url).toBe('/channels/ch-1');
      expect(seen[0].method?.toLowerCase()).toBe('patch');
      expect(JSON.parse(seen[0].data as string)).toEqual({ name: 'New name' });
    });
  });

  describe('publish', () => {
    it('posts to /channels/:id/publish', async () => {
      const seen = capture(CHANNEL);

      await channelService.publish('ch-1');

      expect(seen[0].url).toBe('/channels/ch-1/publish');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });
  });

  describe('archive', () => {
    it('posts to /channels/:id/archive', async () => {
      const seen = capture(CHANNEL);

      await channelService.archive('ch-1');

      expect(seen[0].url).toBe('/channels/ch-1/archive');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });
  });

  describe('uploadCover', () => {
    it('posts multipart form data to /channels/:id/cover', async () => {
      const seen = capture(CHANNEL);
      const file = new File(['x'], 'cover.png', { type: 'image/png' });

      await channelService.uploadCover('ch-1', file);

      expect(seen[0].url).toBe('/channels/ch-1/cover');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(seen[0].data).toBeInstanceOf(FormData);
      expect((seen[0].data as FormData).get('file')).toBe(file);
    });
  });

  describe('upsertProgram', () => {
    const input = {
      name: 'Morning show',
      startTime: '10:00',
      durationMin: 60,
      rrule: 'FREQ=DAILY',
    };

    it('posts to /channels/:id/programs when no programId is given', async () => {
      const seen = capture(PROGRAM);

      await channelService.upsertProgram('ch-1', input);

      expect(seen[0].url).toBe('/channels/ch-1/programs');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual(input);
    });

    it('patches /channels/:id/programs/:programId when a programId is given', async () => {
      const seen = capture(PROGRAM);

      await channelService.upsertProgram('ch-1', input, 'prog-1');

      expect(seen[0].url).toBe('/channels/ch-1/programs/prog-1');
      expect(seen[0].method?.toLowerCase()).toBe('patch');
    });
  });

  describe('deleteProgram', () => {
    it('deletes /channels/:id/programs/:programId', async () => {
      const seen = capture(undefined);

      await channelService.deleteProgram('ch-1', 'prog-1');

      expect(seen[0].url).toBe('/channels/ch-1/programs/prog-1');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });

  describe('setSourceOverride', () => {
    it('puts the eventId to /channels/:id/source-override', async () => {
      const seen = capture(CHANNEL);

      await channelService.setSourceOverride('ch-1', 'evt-2');

      expect(seen[0].url).toBe('/channels/ch-1/source-override');
      expect(seen[0].method?.toLowerCase()).toBe('put');
      expect(JSON.parse(seen[0].data as string)).toEqual({ eventId: 'evt-2' });
    });
  });

  describe('clearSourceOverride', () => {
    it('deletes /channels/:id/source-override', async () => {
      const seen = capture(CHANNEL);

      await channelService.clearSourceOverride('ch-1');

      expect(seen[0].url).toBe('/channels/ch-1/source-override');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });

  describe('goLiveNow', () => {
    it('posts to /channels/:id/programs/:programId/go-live-now', async () => {
      const seen = capture({ eventId: 'evt-1' });

      await expect(channelService.goLiveNow('ch-1', 'prog-1')).resolves.toEqual({
        eventId: 'evt-1',
      });

      expect(seen[0].url).toBe('/channels/ch-1/programs/prog-1/go-live-now');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });
  });

  describe('listProgramEpisodes', () => {
    it('reads from /channels/:id/programs/:programId/episodes', async () => {
      const episode = {
        id: 'ev-1',
        title: 'Morning show',
        startsAt: '2026-01-01T10:00:00.000Z',
        endsAt: '2026-01-01T11:00:00.000Z',
        status: 'FINISHED' as const,
      };
      const seen = capture([episode]);

      await expect(channelService.listProgramEpisodes('ch-1', 'prog-1')).resolves.toEqual([
        episode,
      ]);

      expect(seen[0].url).toBe('/channels/ch-1/programs/prog-1/episodes');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });
  });

  describe('subscribe', () => {
    it('posts the interval to /channels/:id/subscribe', async () => {
      const seen = capture({ url: 'https://checkout.stripe.com/session-1' });

      await expect(channelService.subscribe('ch-1', 'YEARLY')).resolves.toEqual({
        url: 'https://checkout.stripe.com/session-1',
      });

      expect(seen[0].url).toBe('/channels/ch-1/subscribe');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual({ interval: 'YEARLY' });
    });
  });
});
