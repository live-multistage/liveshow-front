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

describe('fetchHomeFeed', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it('fetches live and upcoming in parallel from their own filter URLs', async () => {
    const liveItem = { id: 'live-1' };
    const upcomingItem = { id: 'upcoming-1' };
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('filter=live')) {
        return { ok: true, json: async () => ({ ...emptyPage(), items: [liveItem] }) } as Response;
      }
      if (url.includes('filter=upcoming')) {
        return { ok: true, json: async () => ({ ...emptyPage(), items: [upcomingItem] }) } as Response;
      }
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchHomeFeed } = await import('./get-feed.server');
    const result = await fetchHomeFeed();

    expect(result).toEqual({ live: [liveItem], upcoming: [upcomingItem] });
    const calledUrls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(calledUrls.some((u) => u.includes('/events?filter=live&pageSize=50'))).toBe(true);
    expect(calledUrls.some((u) => u.includes('/events?filter=upcoming&pageSize=50'))).toBe(true);
  });

  it('falls back to empty arrays when a fetch fails, without throwing', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { fetchHomeFeed } = await import('./get-feed.server');
    const result = await fetchHomeFeed();

    expect(result).toEqual({ live: [], upcoming: [] });
  });

  it('falls back to empty arrays when a response is not ok', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => emptyPage() } as Response)) as unknown as typeof fetch;

    const { fetchHomeFeed } = await import('./get-feed.server');
    const result = await fetchHomeFeed();

    expect(result).toEqual({ live: [], upcoming: [] });
  });
});
