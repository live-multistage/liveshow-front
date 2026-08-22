import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/series.service', () => ({
  seriesService: {
    list: vi.fn().mockResolvedValue([]),
    getBySlug: vi.fn().mockResolvedValue(null),
  },
}));

const useQuerySpy = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useQuery: (options: unknown) => {
      useQuerySpy(options);
      return actual.useQuery(options as never);
    },
  };
});

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSeriesListQuery, useSeriesQuery, seriesKeys } from './series.queries';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useSeriesListQuery', () => {
  it('queries the series list key', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useSeriesListQuery(), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: seriesKeys.list, enabled: true }),
    );
  });
});

describe('useSeriesQuery', () => {
  it('queries the series detail key for the given slug', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useSeriesQuery('quinta-do-rock'), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: seriesKeys.detail('quinta-do-rock'), enabled: true }),
    );
  });

  it('disables the query when the slug is empty', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useSeriesQuery(''), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
