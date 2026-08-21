import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/channel.service', () => ({
  channelService: { publish: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePublishChannelMutation } from './channel.mutations';
import { channelService } from '../services/channel.service';
import { channelKeys } from '../queries/channel.queries';
import type { Channel } from '../types/channel.types';

const mockedPublish = vi.mocked(channelService.publish);

const CHANNEL: Channel = {
  id: 'ch-1',
  organizationId: 'org-1',
  slug: 'my-channel',
  name: 'My Channel',
  description: null,
  coverUrl: null,
  accessMode: 'FREE',
  status: 'PUBLISHED',
  broadcastEventId: 'evt-1',
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('usePublishChannelMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the org list and the channel detail on settle', async () => {
    mockedPublish.mockResolvedValue(CHANNEL);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishChannelMutation(), { wrapper });

    result.current.mutate({ id: 'ch-1', organizationId: 'org-1', slug: 'my-channel' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: channelKeys.org('org-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: channelKeys.detail('my-channel'),
    });
  });
});
