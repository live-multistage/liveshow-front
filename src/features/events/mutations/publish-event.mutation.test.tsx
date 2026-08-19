import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/events.service', () => ({
  eventsService: { resumeLive: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useResumeLiveMutation } from './publish-event.mutation';
import { eventsService } from '../services/events.service';

const mockedResumeLive = vi.mocked(eventsService.resumeLive);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useResumeLiveMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces an error toast when the backend rejects the resume request', async () => {
    mockedResumeLive.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Resume window has expired.' } },
    });
    const { result } = renderHook(() => useResumeLiveMutation('evt-1'), { wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Resume window has expired.');
  });
});
