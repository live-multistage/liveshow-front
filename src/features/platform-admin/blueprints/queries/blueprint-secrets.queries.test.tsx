vi.mock('../services/blueprints.service', () => ({
  blueprintsService: {
    listSecrets: vi.fn().mockResolvedValue([{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }]),
  },
}));

import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { blueprintsService } from '../services/blueprints.service';
import { useBlueprintSecretsQuery } from './blueprint-secrets.queries';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

afterEach(() => vi.clearAllMocks());

describe('useBlueprintSecretsQuery', () => {
  it('fetches the secret summaries (names + updatedAt, never the value)', async () => {
    const { result } = renderHook(() => useBlueprintSecretsQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([{ name: 'PARTNER', updatedAt: '2026-01-01T00:00:00Z' }]));
    expect(blueprintsService.listSecrets).toHaveBeenCalled();
  });

  it('is disabled when enabled: false is passed (no secretFields on the entry)', () => {
    const { result } = renderHook(() => useBlueprintSecretsQuery({ enabled: false }), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(blueprintsService.listSecrets).not.toHaveBeenCalled();
  });
});
