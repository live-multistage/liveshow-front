import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/organization.service', () => ({
  organizationService: {
    listMyOrganizations: vi.fn(),
    getMyOrganizationsSummary: vi.fn(),
  },
}));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { organizationService } from '../services/organization.service';
import { ORGANIZATIONS_KEY } from './use-organizations';
import { useMyOrganizationsPageQuery, useMyOrganizationsSummaryQuery } from './use-my-organizations-page';

const listMock = organizationService.listMyOrganizations as ReturnType<typeof vi.fn>;
const summaryMock = organizationService.getMyOrganizationsSummary as ReturnType<typeof vi.fn>;

const SUMMARY = {
  counts: { all: 2, owned: 1, invited: 1, archived: 0 },
  totals: { activeEventsCount: 0, memberCount: 3, salesThisMonth: [] },
};

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('my organizations page queries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useMyOrganizationsPageQuery forwards params to the service', async () => {
    listMock.mockResolvedValue({ items: [], page: 2, pageSize: 20, total: 30 });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyOrganizationsPageQuery({ page: 2, filter: 'owned', q: 'acme' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith({ page: 2, filter: 'owned', q: 'acme' });
  });

  it('useMyOrganizationsSummaryQuery returns the summary', async () => {
    summaryMock.mockResolvedValue(SUMMARY);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useMyOrganizationsSummaryQuery(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
  });

  it('invalidating ORGANIZATIONS_KEY refetches both page and summary', async () => {
    listMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    summaryMock.mockResolvedValue(SUMMARY);
    const { queryClient, wrapper } = makeWrapper();
    const page = renderHook(() => useMyOrganizationsPageQuery({ page: 1 }), { wrapper });
    const summary = renderHook(() => useMyOrganizationsSummaryQuery(), { wrapper });
    await waitFor(() => expect(page.result.current.isSuccess && summary.result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(summaryMock).toHaveBeenCalledTimes(2);
  });
});
