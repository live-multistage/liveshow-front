import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/streaming.service', () => ({
  streamingService: {
    checkLiveAccess: vi.fn().mockResolvedValue(true),
    checkReplayAccess: vi.fn().mockResolvedValue(true),
    getLivePlayback: vi.fn().mockResolvedValue(null),
    getReplayPlayback: vi.fn().mockResolvedValue(null),
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
import { useReplayPlaybackQuery } from './live.queries';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useReplayPlaybackQuery', () => {
  it('refetches every 45 minutes, including in the background, to keep the pt token fresh', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useReplayPlaybackQuery('my-event', true), { wrapper });

    expect(useQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 60_000,
        refetchInterval: 45 * 60_000,
        refetchIntervalInBackground: true,
      }),
    );
  });
});
