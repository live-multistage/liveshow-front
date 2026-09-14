vi.mock('../services/blueprints.service', () => ({
  blueprintsService: {
    setSecret: vi.fn().mockResolvedValue(undefined),
    deleteSecret: vi.fn().mockResolvedValue(undefined),
  },
}));

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { blueprintsService } from '../services/blueprints.service';
import { useDeleteBlueprintSecretMutation, useSetBlueprintSecretMutation } from './blueprint-secrets.mutations';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { wrapper, invalidateSpy };
}

describe('useSetBlueprintSecretMutation', () => {
  it('calls setSecret and invalidates the secrets list on success', async () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useSetBlueprintSecretMutation(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ name: 'PARTNER', value: 'shh' }); });

    expect(blueprintsService.setSecret).toHaveBeenCalledWith('PARTNER', 'shh');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['platform-admin', 'blueprints', 'secrets'],
    })));
  });
});

describe('useDeleteBlueprintSecretMutation', () => {
  it('calls deleteSecret and invalidates the secrets list on success', async () => {
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useDeleteBlueprintSecretMutation(), { wrapper });

    await act(async () => { await result.current.mutateAsync({ name: 'PARTNER' }); });

    expect(blueprintsService.deleteSecret).toHaveBeenCalledWith('PARTNER');
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['platform-admin', 'blueprints', 'secrets'],
    })));
  });
});
