import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/artist.service', () => ({
  artistService: { getInsights: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useArtistInsights } from './use-artists';
import { artistService } from '../services/artist.service';

const mockedGetInsights = vi.mocked(artistService.getInsights);

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe('useArtistInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when there are no ids', () => {
    renderHook(() => useArtistInsights([]), { wrapper: makeWrapper() });
    expect(mockedGetInsights).not.toHaveBeenCalled();
  });

  it('fetches each id once, capped at 50', async () => {
    mockedGetInsights.mockResolvedValue([]);
    const ids = [...Array.from({ length: 60 }, (_, i) => `id-${i}`), 'id-0', 'id-1'];

    const { result } = renderHook(() => useArtistInsights(ids), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const requested = mockedGetInsights.mock.calls[0][0];
    expect(requested).toHaveLength(50);
    expect(new Set(requested).size).toBe(50);
  });

  it('surfaces a failure (e.g. 403 for a non-organizer) without retrying', async () => {
    mockedGetInsights.mockRejectedValue(new Error('403'));

    const { result } = renderHook(() => useArtistInsights(['a1']), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockedGetInsights).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBeUndefined();
  });
});
