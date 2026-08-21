import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/channel.service', () => ({
  channelService: { getBySlug: vi.fn().mockResolvedValue(null) },
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
import { useChannelQuery } from './channel.queries';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useChannelQuery', () => {
  it('refetches every 60 seconds', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useChannelQuery('my-channel'), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ refetchInterval: 60_000 }),
    );
  });
});
