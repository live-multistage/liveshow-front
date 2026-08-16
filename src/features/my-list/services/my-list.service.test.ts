import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { myListService } from './my-list.service';
import type { AccessibleEvent } from '../types/my-list.types';

const EVENT: AccessibleEvent = {
  id: 'ev-1',
  title: 'Show',
  status: 'LIVE',
  startsAt: '2026-01-01T20:00:00.000Z',
  endsAt: '2026-01-01T22:00:00.000Z',
  thumbnailUrl: null,
  bannerUrl: null,
  venue: null,
  city: null,
  capabilities: ['LIVE_VIEW'],
  canWatchLive: true,
  canWatchReplay: false,
};

describe('myListService.getAccessibleEvents', () => {
  const originalAdapter = httpClient.defaults.adapter;
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  function capture(payload: unknown = [EVENT]) {
    const seen: AxiosRequestConfig[] = [];
    httpClient.defaults.adapter = (async (config) => {
      seen.push(config);
      return { data: payload, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    return seen;
  }

  it('reads the list from the /me route', async () => {
    const seen = capture();

    await myListService.getAccessibleEvents();

    expect(seen[0].url).toBe('/me/accessible-events');
    expect(seen[0].method?.toLowerCase()).toBe('get');
  });

  /**
   * O servidor tira o usuário do token, e a rota não aceita um. Mandar um id
   * daqui não daria acesso a nada, mas sinalizaria que o cliente acredita
   * poder escolher de quem é a lista — e é dessa crença que nascem as
   * sobrecargas "só para um admin" que viram bypass.
   */
  it('sends no user identifier of its own', async () => {
    const seen = capture();

    await myListService.getAccessibleEvents();

    expect(seen[0].params).toBeUndefined();
    expect(seen[0].data).toBeUndefined();
    expect(seen[0].url).not.toContain('userId');
  });

  it('returns the events as given', async () => {
    capture([EVENT]);

    await expect(myListService.getAccessibleEvents()).resolves.toEqual([EVENT]);
  });

  it('passes an empty list straight through', async () => {
    capture([]);

    await expect(myListService.getAccessibleEvents()).resolves.toEqual([]);
  });
});
