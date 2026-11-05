import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicPage, fetchPublicPageList } from './get-public-page.server';

const jsonResponse = (body: unknown, init: { status?: number } = {}) =>
  new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'content-type': 'application/json' } });

describe('fetchPublicPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the page and revalidates on the pages tag', async () => {
    const page = { slug: 'verao', title: 'Verão' };
    fetchMock.mockResolvedValue(jsonResponse(page));

    await expect(fetchPublicPage('verao')).resolves.toEqual(page);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/pages\/verao$/);
    expect(init).toEqual({ next: { revalidate: 300, tags: ['pages'] } });
  });

  it('returns null on 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, { status: 404 }));

    await expect(fetchPublicPage('verao')).resolves.toBeNull();
  });

  it('returns null when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'));

    await expect(fetchPublicPage('verao')).resolves.toBeNull();
  });

  it('returns null without fetching for an invalid slug', async () => {
    await expect(fetchPublicPage('Não Válido')).resolves.toBeNull();
    await expect(fetchPublicPage('admin')).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchPublicPageList', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the list and revalidates on the pages tag', async () => {
    const list = [{ slug: 'verao', updatedAt: '2026-11-05T00:00:00Z' }];
    fetchMock.mockResolvedValue(jsonResponse(list));

    await expect(fetchPublicPageList()).resolves.toEqual(list);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/pages$/);
    expect(init).toEqual({ next: { revalidate: 300, tags: ['pages'] } });
  });

  it('returns an empty list when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));

    await expect(fetchPublicPageList()).resolves.toEqual([]);
  });

  it('returns an empty list when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'));

    await expect(fetchPublicPageList()).resolves.toEqual([]);
  });
});
