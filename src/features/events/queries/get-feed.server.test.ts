import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PaginatedEventsResponse } from '../types/event.types';

// React's cache() (used by get-feed.server.ts) only exists on the React 19
// build Next.js vendors at runtime — the workspace's react 18.3.1 (what
// vitest resolves) doesn't export it. Stub it as a passthrough so importing
// the module directly here doesn't crash; production behavior is untouched.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));

const emptyPage = (): PaginatedEventsResponse => ({ items: [], page: 1, pageSize: 50, total: 0 });

describe('fetchFeedPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it('requests the given page and pageSize', async () => {
    const page3 = { items: [{ id: 'e-3' }], page: 3, pageSize: 24, total: 100 };
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => page3 } as Response));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchFeedPage } = await import('./get-feed.server');
    const result = await fetchFeedPage(3, 24);

    expect(result).toEqual(page3);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/events?filter=all&page=3&pageSize=24');
  });

  it('falls back to an empty page (with the requested page/pageSize) when the response is not ok', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => emptyPage() } as Response)) as unknown as typeof fetch;

    const { fetchFeedPage } = await import('./get-feed.server');
    const result = await fetchFeedPage(5, 24);

    expect(result).toEqual({ items: [], page: 5, pageSize: 24, total: 0 });
  });

  it('falls back to an empty page when the fetch throws', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { fetchFeedPage } = await import('./get-feed.server');
    const result = await fetchFeedPage(2, 24);

    expect(result).toEqual({ items: [], page: 2, pageSize: 24, total: 0 });
  });
});
