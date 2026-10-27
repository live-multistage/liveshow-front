import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/events.service', () => ({
  eventsService: {
    listMyEvents: vi.fn(),
    getMyEventCounts: vi.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { eventsService } from '../services/events.service';
import { MY_EVENTS_KEY } from './get-my-events';
import { useMyEventCountsQuery, useMyEventsPageQuery } from './use-my-events-page';

const listMock = eventsService.listMyEvents as ReturnType<typeof vi.fn>;
const countsMock = eventsService.getMyEventCounts as ReturnType<typeof vi.fn>;

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('my events page queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useMyEventsPageQuery forwards params to the service', async () => {
    listMock.mockResolvedValue({ items: [], page: 3, pageSize: 20, total: 60 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyEventsPageQuery({ page: 3, status: 'FINISHED' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith({ page: 3, status: 'FINISHED' });
  });

  it('useMyEventCountsQuery returns the counts', async () => {
    countsMock.mockResolvedValue({ all: 2, live: 0, upcoming: 1, finished: 1 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyEventCountsQuery(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ all: 2, live: 0, upcoming: 1, finished: 1 }));
  });

  it('invalidating MY_EVENTS_KEY refetches both page and counts', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    countsMock.mockResolvedValue({ all: 0, live: 0, upcoming: 0, finished: 0 });
    const { queryClient, wrapper } = makeWrapper();
    const page = renderHook(() => useMyEventsPageQuery({ page: 1 }), { wrapper });
    const counts = renderHook(() => useMyEventCountsQuery(), { wrapper });
    await waitFor(() => expect(page.result.current.isSuccess && counts.result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(countsMock).toHaveBeenCalledTimes(2);
  });
});
