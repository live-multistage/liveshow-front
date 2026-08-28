import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/cart.service', () => ({
  cartService: { add: vi.fn(), remove: vi.fn(), clear: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { useAddToCartMutation } from './cart.mutations';
import { cartService } from '../services/cart.service';

const mockedAdd = vi.mocked(cartService.add);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

describe('useAddToCartMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the translated currency-mismatch toast on a 409 CART_CURRENCY_MISMATCH', async () => {
    mockedAdd.mockRejectedValue(
      new AxiosError('Conflict', undefined, undefined, undefined, {
        status: 409,
        data: { message: 'currency mismatch', code: 'CART_CURRENCY_MISMATCH' },
      } as never),
    );
    const { result } = renderHook(() => useAddToCartMutation(), { wrapper: makeWrapper() });

    result.current.mutate('tp-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('errors.CURRENCY_MISMATCH');
  });
});
