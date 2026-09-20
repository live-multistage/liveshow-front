import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/organization.service', () => ({
  organizationService: { getAsaasSubaccount: vi.fn(), createAsaasSubaccount: vi.fn() },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAsaasSubaccount } from './use-asaas-subaccount';
import { useCreateAsaasSubaccount } from './use-create-asaas-subaccount';
import { asaasSubaccountKey } from './use-asaas-subaccount';
import { organizationService } from '../services/organization.service';
import type { AsaasSubaccountResponse, CreateAsaasSubaccountRequest } from '@live-show/api-contracts';

const mockedGet = vi.mocked(organizationService.getAsaasSubaccount);
const mockedCreate = vi.mocked(organizationService.createAsaasSubaccount);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe('useAsaasSubaccount', () => {
  it('resolves null when there is no account', async () => {
    mockedGet.mockResolvedValueOnce(null);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAsaasSubaccount('org-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mockedGet).toHaveBeenCalledWith('org-1');
  });
});

describe('useCreateAsaasSubaccount', () => {
  it('writes the response into the query cache on success', async () => {
    const response: AsaasSubaccountResponse = {
      status: 'PENDING_APPROVAL',
      walletIdMasked: '••••1234',
      createdAt: '2026-09-19T00:00:00.000Z',
    };
    mockedCreate.mockResolvedValueOnce(response);
    const { queryClient, wrapper } = makeWrapper();

    const { result } = renderHook(() => useCreateAsaasSubaccount('org-1'), { wrapper });

    const body = {} as CreateAsaasSubaccountRequest;
    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(asaasSubaccountKey('org-1'))).toBe(response);
  });
});
