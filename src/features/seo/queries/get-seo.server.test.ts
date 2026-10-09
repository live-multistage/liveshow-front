import { afterEach, describe, expect, it, vi } from 'vitest';
// React.cache only exists in the RSC runtime; identity keeps the test about the fetch.
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }));

import { getSeoForPage, getSeoGlobal, getSeoNoindex } from './get-seo.server';

const calls = [
  ['getSeoGlobal', () => getSeoGlobal()],
  ['getSeoForPage', () => getSeoForPage('events.detail', '/events/x')],
  ['getSeoNoindex', () => getSeoNoindex()],
] as const;

describe('seo queries', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the page config with the encoded path and seo tag', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pageKey: 'events.detail' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getSeoForPage('events.detail', '/events/x')).resolves.toEqual({ pageKey: 'events.detail' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/seo\/pages\/events\.detail\?path=%2Fevents%2Fx$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { tags: ['seo'], revalidate: 300 } });
  });

  it('requests global and noindex endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await getSeoGlobal();
    await getSeoNoindex();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/seo\/global$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/seo\/noindex$/);
  });

  it.each(calls)('%s returns null on non-ok and on network error', async (_name, call) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(call()).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(call()).resolves.toBeNull();
  });
});
