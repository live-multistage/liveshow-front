import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/wishlist.service', () => ({
  wishlistService: { add: vi.fn(), remove: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useToggleWishlistMutation } from './toggle-wishlist.mutation';
import { wishlistService } from '../services/wishlist.service';
import { wishlistKeys } from '../queries/get-wishlist';

const mockedAdd = vi.mocked(wishlistService.add);
const mockedRemove = vi.mocked(wishlistService.remove);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('useToggleWishlistMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds the id to the cache before the add request resolves', async () => {
    let resolveAdd!: () => void;
    mockedAdd.mockReturnValue(new Promise<void>((resolve) => (resolveAdd = resolve)));
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(wishlistKeys.ids, ['a']);
    const { result } = renderHook(() => useToggleWishlistMutation(), { wrapper });

    result.current.mutate({ eventId: 'b', saved: false });

    await waitFor(() =>
      expect(queryClient.getQueryData<string[]>(wishlistKeys.ids)).toEqual(['a', 'b']),
    );

    resolveAdd();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('savedToast');
  });

  it('rolls back the cache and toasts an error when the service rejects', async () => {
    mockedAdd.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { message: 'boom' } },
    });
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(wishlistKeys.ids, ['a']);
    const { result } = renderHook(() => useToggleWishlistMutation(), { wrapper });

    result.current.mutate({ eventId: 'b', saved: false });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<string[]>(wishlistKeys.ids)).toEqual(['a']);
    expect(toast.error).toHaveBeenCalled();
  });

  it('removes an already-saved id from the cache when toggled off', async () => {
    mockedRemove.mockResolvedValue(undefined);
    const { queryClient, wrapper } = makeWrapper();
    queryClient.setQueryData(wishlistKeys.ids, ['a', 'b']);
    const { result } = renderHook(() => useToggleWishlistMutation(), { wrapper });

    result.current.mutate({ eventId: 'b', saved: true });

    await waitFor(() =>
      expect(queryClient.getQueryData<string[]>(wishlistKeys.ids)).toEqual(['a']),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedRemove).toHaveBeenCalledWith('b');
    expect(toast.success).toHaveBeenCalledWith('removedToast');
  });
});
