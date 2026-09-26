import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/home.service', () => ({
  homeService: {
    rails: vi.fn(),
  },
}));

vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({ isLoggedIn: false, isLoading: false })),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { homeService } from '../services/home.service';
import { useHomeRailsQuery } from './get-home-rails';

const railsMock = homeService.rails as ReturnType<typeof vi.fn>;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

function makePage(nextCursor: string | null): HomeRailsResponse {
  return {
    rails: [],
    nextCursor,
    snapshotAt: '2026-09-26T00:00:00.000Z',
  };
}

describe('useHomeRailsQuery', () => {
  beforeEach(() => {
    railsMock.mockReset();
  });

  it('fetches the first page with an undefined cursor', async () => {
    railsMock.mockResolvedValue(makePage('cursor-2'));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useHomeRailsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(railsMock).toHaveBeenCalledWith({ cursor: undefined });
  });

  it('fetchNextPage calls the service with the previous page nextCursor', async () => {
    railsMock.mockResolvedValueOnce(makePage('cursor-2'));
    railsMock.mockResolvedValueOnce(makePage(null));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useHomeRailsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await result.current.fetchNextPage();

    await waitFor(() => expect(railsMock).toHaveBeenCalledTimes(2));
    expect(railsMock).toHaveBeenLastCalledWith({ cursor: 'cursor-2' });
  });

  it('hasNextPage is false once nextCursor is null', async () => {
    railsMock.mockResolvedValue(makePage(null));
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useHomeRailsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });
});
