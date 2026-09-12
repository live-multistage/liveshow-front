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

import { AxiosError, AxiosHeaders } from 'axios';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLivePlaybackQuery, useReplayPlaybackQuery } from './live.queries';

function makeHttpError(status: number) {
  return new AxiosError('Request failed', undefined, { headers: new AxiosHeaders() } as never, undefined, {
    status,
    data: {},
  } as never);
}

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

  it('does not retry a 401/403 (already unauthorized — no point retrying), but retries other errors', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useReplayPlaybackQuery('my-event', true), { wrapper });

    const { retry } = useQuerySpy.mock.calls.at(-1)![0] as {
      retry: (count: number, error: unknown) => boolean;
    };
    expect(retry(0, makeHttpError(401))).toBe(false);
    expect(retry(0, makeHttpError(403))).toBe(false);
    expect(retry(0, makeHttpError(500))).toBe(true);
    expect(retry(3, makeHttpError(500))).toBe(false); // still caps at 3
  });
});

describe('useLivePlaybackQuery', () => {
  it('does not retry a 401/403, but retries other errors up to 3 times', () => {
    const { wrapper } = makeWrapper();

    renderHook(() => useLivePlaybackQuery('my-event', true), { wrapper });

    const { retry } = useQuerySpy.mock.calls.at(-1)![0] as {
      retry: (count: number, error: unknown) => boolean;
    };
    expect(retry(0, makeHttpError(401))).toBe(false);
    expect(retry(0, makeHttpError(403))).toBe(false);
    expect(retry(0, makeHttpError(500))).toBe(true);
    expect(retry(3, makeHttpError(500))).toBe(false);
  });
});
