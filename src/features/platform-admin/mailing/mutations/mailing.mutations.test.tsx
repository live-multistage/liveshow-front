vi.mock('../services/mailing.service', () => ({
  mailingService: {
    dispatchCampaign: vi.fn(),
    cancelCampaign: vi.fn(),
  },
}));

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCancelMailingCampaignMutation, useDispatchMailingCampaignMutation } from './mailing.mutations';
import { mailingKeys } from '../queries/mailing.queries';
import { mailingService } from '../services/mailing.service';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('mailing campaign mutations on 409 conflict', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dispatch invalidates the campaign and the list on a 409 CAMPAIGN_NOT_EDITABLE', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(mailingService.dispatchCampaign).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CAMPAIGN_NOT_EDITABLE' } },
    });

    const { result } = renderHook(() => useDispatchMailingCampaignMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate({ id: 'c1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mailingKeys.campaign('c1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mailingKeys.campaigns() });
  });

  it('cancel invalidates the campaign and the list on a 409', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(mailingService.cancelCampaign).mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CAMPAIGN_NOT_EDITABLE' } },
    });

    const { result } = renderHook(() => useCancelMailingCampaignMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate('c1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mailingKeys.campaign('c1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: mailingKeys.campaigns() });
  });
});
