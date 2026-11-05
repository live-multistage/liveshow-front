import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../services/pages.service', () => ({
  pagesService: {
    list: vi.fn(),
    get: vi.fn(),
    listVersions: vi.fn(),
    publishDiff: vi.fn(),
  },
}));

import { pagesService } from '../services/pages.service';
import { pageKeys } from './page.keys';
import { usePageQuery, usePageVersionsQuery, usePagesListQuery, usePublishDiffQuery } from './use-pages';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

describe('usePagesListQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes the filter to the service and caches under the filtered key', async () => {
    vi.mocked(pagesService.list).mockResolvedValueOnce([]);
    const { qc, wrapper } = setup();
    const filter = { status: 'DRAFT' as const, q: 'home' };
    const { result } = renderHook(() => usePagesListQuery(filter), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pagesService.list).toHaveBeenCalledWith(filter);
    expect(qc.getQueryData(pageKeys.list(filter))).toEqual([]);
  });

  it('is fresh for 30 seconds', async () => {
    vi.mocked(pagesService.list).mockResolvedValueOnce([]);
    const { qc, wrapper } = setup();
    const filter = {};
    const { result } = renderHook(() => usePagesListQuery(filter), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryCache().find({ queryKey: pageKeys.list(filter) })?.isStale()).toBe(false);
  });
});

describe('usePageQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not fetch without an id', () => {
    const { wrapper } = setup();
    renderHook(() => usePageQuery(null), { wrapper });
    expect(pagesService.get).not.toHaveBeenCalled();
  });

  it('fetches the page by id', async () => {
    vi.mocked(pagesService.get).mockResolvedValueOnce({ id: 'p1' } as never);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePageQuery('p1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pagesService.get).toHaveBeenCalledWith('p1');
  });
});

describe('usePageVersionsQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('respects enabled=false', () => {
    const { wrapper } = setup();
    renderHook(() => usePageVersionsQuery('p1', { enabled: false }), { wrapper });
    expect(pagesService.listVersions).not.toHaveBeenCalled();
  });

  it('fetches versions when enabled', async () => {
    vi.mocked(pagesService.listVersions).mockResolvedValueOnce([]);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePageVersionsQuery('p1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pagesService.listVersions).toHaveBeenCalledWith('p1');
  });
});

describe('usePublishDiffQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('respects enabled=false', () => {
    const { wrapper } = setup();
    renderHook(() => usePublishDiffQuery('p1', { enabled: false }), { wrapper });
    expect(pagesService.publishDiff).not.toHaveBeenCalled();
  });

  it('is always stale (staleTime 0) so the diff is recomputed on each open', async () => {
    vi.mocked(pagesService.publishDiff).mockResolvedValueOnce({ added: 0, removed: 0, edited: 0, hidden: 0 });
    const { qc, wrapper } = setup();
    const { result } = renderHook(() => usePublishDiffQuery('p1', { enabled: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pagesService.publishDiff).toHaveBeenCalledWith('p1');
    expect(qc.getQueryCache().find({ queryKey: pageKeys.diff('p1') })?.isStale()).toBe(true);
  });
});
