import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/series.service', () => ({
  seriesService: {
    list: vi.fn().mockResolvedValue([]),
    getBySlug: vi.fn().mockResolvedValue(null),
    listByOrg: vi.fn().mockResolvedValue([]),
    listEpisodes: vi.fn().mockResolvedValue([]),
    listTicketProducts: vi.fn().mockResolvedValue([]),
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
import {
  useSeriesListQuery,
  useSeriesQuery,
  useOrgSeriesQuery,
  useSeriesEpisodesQuery,
  useSeriesTicketProductsQuery,
  seriesKeys,
} from './series.queries';

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

describe('useOrgSeriesQuery', () => {
  it('queries the org series key for the given organization', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useOrgSeriesQuery('org-1'), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: seriesKeys.org('org-1'), enabled: true }),
    );
  });

  it('disables the query when the organizationId is empty', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useOrgSeriesQuery(''), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useSeriesEpisodesQuery', () => {
  it('queries the episodes key for the given series', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useSeriesEpisodesQuery('series-1'), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: seriesKeys.episodes('series-1'), enabled: true }),
    );
  });
});

describe('useSeriesTicketProductsQuery', () => {
  it('queries the ticket-products key for the given series', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useSeriesTicketProductsQuery('series-1'), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: seriesKeys.ticketProducts('series-1'),
        enabled: true,
      }),
    );
  });
});
