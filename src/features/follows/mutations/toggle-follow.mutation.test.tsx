import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/follows.service', () => ({
  followsService: { follow: vi.fn(), unfollow: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useToggleFollowMutation } from './toggle-follow.mutation';
import { followsService } from '../services/follows.service';
import { followKeys } from '../queries/get-follows';

const mockedFollow = vi.mocked(followsService.follow);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useToggleFollowMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back to the previous ids when they existed in cache', async () => {
    mockedFollow.mockRejectedValue(new Error('boom'));
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(followKeys.ids('ARTIST'), ['a']);
    const { result } = renderHook(() => useToggleFollowMutation(), { wrapper });

    result.current.mutate({ targetType: 'ARTIST', targetId: 'b', following: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(followKeys.ids('ARTIST'))).toEqual(['a']);
  });

  // Regression: previousIds is undefined when nothing was cached yet (e.g. a
  // fresh page load). Rolling back with setQueryData(key, undefined) planted
  // an `undefined` entry the ids query would then treat as "loaded, empty"
  // instead of letting it refetch — removeQueries clears it properly.
  it('removes the query instead of caching undefined when nothing was cached before the mutation', async () => {
    mockedFollow.mockRejectedValue(new Error('boom'));
    const { queryClient, wrapper } = makeWrapper();
    const { result } = renderHook(() => useToggleFollowMutation(), { wrapper });

    result.current.mutate({ targetType: 'ARTIST', targetId: 'b', following: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryState(followKeys.ids('ARTIST'))).toBeUndefined();
    expect(queryClient.getQueryState(followKeys.count('ARTIST', 'b'))).toBeUndefined();
  });
});
