import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/channel.service', () => ({
  channelService: {
    publish: vi.fn(),
    subscribe: vi.fn(),
    syncPricing: vi.fn(),
    setSourceOverride: vi.fn(),
    clearSourceOverride: vi.fn(),
    upsertProgram: vi.fn(),
    deleteProgram: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import {
  usePublishChannelMutation,
  useSubscribeChannelMutation,
  useSyncChannelPricingMutation,
  useSetChannelSourceOverrideMutation,
  useClearChannelSourceOverrideMutation,
  useUpsertProgramMutation,
  useDeleteProgramMutation,
} from './channel.mutations';
import { channelService } from '../services/channel.service';
import { channelKeys } from '../queries/channel.queries';
import type { OrgChannel, Program } from '../types/channel.types';

const mockedPublish = vi.mocked(channelService.publish);
const mockedSubscribe = vi.mocked(channelService.subscribe);
const mockedSyncPricing = vi.mocked(channelService.syncPricing);
const mockedSetSourceOverride = vi.mocked(channelService.setSourceOverride);
const mockedClearSourceOverride = vi.mocked(channelService.clearSourceOverride);
const mockedUpsertProgram = vi.mocked(channelService.upsertProgram);
const mockedDeleteProgram = vi.mocked(channelService.deleteProgram);

const PROGRAM: Program = {
  id: 'prg-1',
  channelId: 'ch-1',
  name: 'Jornal',
  description: null,
  startTime: '20:00:00',
  durationMin: 60,
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  eventId: null,
};

const CHANNEL: OrgChannel = {
  id: 'ch-1',
  organizationId: 'org-1',
  slug: 'my-channel',
  name: 'My Channel',
  description: null,
  coverUrl: null,
  accessMode: 'FREE',
  status: 'PUBLISHED',
  broadcastEventId: 'evt-1',
  currency: null,
  monthlyPriceCents: null,
  yearlyPriceCents: null,
  pricingSynced: false,
  sourceOverride: null,
  isOnAir: false,
  current: null,
  next: null,
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
      queryKey: channelKeys.orgDetail('ch-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: channelKeys.detail('my-channel'),
    });
  });
});

describe('useSyncChannelPricingMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the sync endpoint and invalidates the org list and channel detail', async () => {
    mockedSyncPricing.mockResolvedValue({ ...CHANNEL, currency: 'BRL', monthlyPriceCents: 1990, yearlyPriceCents: null, pricingSynced: true });
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSyncChannelPricingMutation(), { wrapper });

    result.current.mutate({ id: 'ch-1', organizationId: 'org-1', slug: 'my-channel' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSyncPricing).toHaveBeenCalledWith('ch-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.org('org-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.orgDetail('ch-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.detail('my-channel') });
  });
});

describe('useSetChannelSourceOverrideMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the override endpoint and invalidates channel queries', async () => {
    mockedSetSourceOverride.mockResolvedValue({ ...CHANNEL, sourceOverride: { eventId: 'evt-9', until: '2026-08-25T00:00:00.000Z' } });
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetChannelSourceOverrideMutation(), { wrapper });

    result.current.mutate({ id: 'ch-1', slug: 'my-channel', organizationId: 'org-1', eventId: 'evt-9' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSetSourceOverride).toHaveBeenCalledWith('ch-1', 'evt-9');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.orgDetail('ch-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.detail('my-channel') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.playback('my-channel') });
  });
});

describe('useClearChannelSourceOverrideMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the clear endpoint and invalidates channel queries', async () => {
    mockedClearSourceOverride.mockResolvedValue(CHANNEL);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useClearChannelSourceOverrideMutation(), { wrapper });

    result.current.mutate({ id: 'ch-1', slug: 'my-channel', organizationId: 'org-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedClearSourceOverride).toHaveBeenCalledWith('ch-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.detail('my-channel') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.playback('my-channel') });
  });
});

describe('useUpsertProgramMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the schedule and the channel playback (a linked event can change what is on air)', async () => {
    mockedUpsertProgram.mockResolvedValue(PROGRAM);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpsertProgramMutation('ch-1'), { wrapper });

    result.current.mutate({
      input: { name: 'Jornal', startTime: '20:00', durationMin: 60, rrule: 'FREQ=WEEKLY;BYDAY=MO' },
      slug: 'my-channel',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.detail('my-channel') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.programs('ch-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.playback('my-channel') });
  });
});

describe('useDeleteProgramMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the schedule and the channel playback (a deleted program can drop its carried event)', async () => {
    mockedDeleteProgram.mockResolvedValue(undefined);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteProgramMutation('ch-1'), { wrapper });

    result.current.mutate({ programId: 'prg-1', slug: 'my-channel' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.detail('my-channel') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.programs('ch-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: channelKeys.playback('my-channel') });
  });
});

describe('useSubscribeChannelMutation', () => {
  const originalAssign = window.location.assign;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: originalAssign },
      writable: true,
    });
  });

  it('redirects to the checkout url on success', async () => {
    mockedSubscribe.mockResolvedValue({ url: 'https://checkout.stripe.com/session-1' });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubscribeChannelMutation(), { wrapper });

    result.current.mutate({ channelId: 'ch-1', interval: 'MONTHLY' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSubscribe).toHaveBeenCalledWith('ch-1', 'MONTHLY');
    expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/session-1');
  });

  it('shows the already-subscribed toast on a 409', async () => {
    mockedSubscribe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: {} },
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubscribeChannelMutation(), { wrapper });

    result.current.mutate({ channelId: 'ch-1', interval: 'MONTHLY' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith('alreadySubscribed');
  });
});
