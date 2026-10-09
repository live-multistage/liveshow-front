import { afterEach, describe, expect, it, vi } from 'vitest';
// React.cache only exists in the RSC runtime; identity keeps the test about the fetch.
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T,>(fn: T) => fn }));

import { fetchLegalDocument } from './get-legal-document.server';

describe('fetchLegalDocument', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tags the fetch with legal and returns the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 2 }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchLegalDocument('privacy')).resolves.toEqual({ version: 2 });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/legal\/privacy$/);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { tags: ['legal'], revalidate: 300 } });
  });

  it('returns null on non-ok and on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchLegalDocument('terms')).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(fetchLegalDocument('terms')).resolves.toBeNull();
  });
});
