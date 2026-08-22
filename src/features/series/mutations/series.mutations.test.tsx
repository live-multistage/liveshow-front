import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/series.service', () => ({
  seriesService: {
    create: vi.fn(),
    update: vi.fn(),
    materialize: vi.fn(),
    reattachEpisode: vi.fn(),
    createTicketProduct: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCreateSeriesMutation,
  useUpdateSeriesMutation,
  useMaterializeSeriesMutation,
  useReattachEpisodeMutation,
  useCreateSeriesTicketProductMutation,
} from './series.mutations';
import { seriesService } from '../services/series.service';
import { seriesKeys } from '../queries/series.queries';
import type { SeriesOrgResponse } from '../types/series.types';

const SERIES: SeriesOrgResponse = {
  id: 'series-1',
  organizationId: 'org-1',
  slug: 'quinta-do-rock',
  name: 'Quinta do Rock',
  description: null,
  rrule: 'FREQ=WEEKLY;BYDAY=TH',
  dtstart: '2026-01-01T23:00:00.000Z',
  timezone: 'America/Sao_Paulo',
  durationMin: 90,
  horizonWeeks: 4,
  templateEventId: 'evt-template-1',
  status: 'ACTIVE',
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

describe('useCreateSeriesMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the list and the org series on settle', async () => {
    vi.mocked(seriesService.create).mockResolvedValue(SERIES);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateSeriesMutation(), { wrapper });

    result.current.mutate({
      organizationId: 'org-1',
      slug: 'quinta-do-rock',
      name: 'Quinta do Rock',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
      dtstart: '2026-01-01T23:00:00.000Z',
      timezone: 'America/Sao_Paulo',
      durationMin: 90,
      horizonWeeks: 4,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seriesKeys.list });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seriesKeys.org('org-1') });
  });
});

describe('useUpdateSeriesMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates every series query on settle', async () => {
    vi.mocked(seriesService.update).mockResolvedValue(SERIES);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateSeriesMutation(), { wrapper });

    result.current.mutate({
      id: 'series-1',
      organizationId: 'org-1',
      slug: 'quinta-do-rock',
      input: { name: 'Novo nome' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seriesKeys.all });
  });
});

describe('useMaterializeSeriesMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the episodes list on settle', async () => {
    vi.mocked(seriesService.materialize).mockResolvedValue(undefined);
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMaterializeSeriesMutation(), { wrapper });

    result.current.mutate({ id: 'series-1', organizationId: 'org-1', slug: 'quinta-do-rock' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seriesKeys.episodes('series-1') });
  });
});

describe('useReattachEpisodeMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the service with seriesId and eventId, then invalidates episodes', async () => {
    vi.mocked(seriesService.reattachEpisode).mockResolvedValue({
      id: 'evt-2',
      title: 'Episódio',
      startsAt: '2026-01-08T23:00:00.000Z',
      endsAt: '2026-01-09T00:30:00.000Z',
      status: 'SCHEDULED',
      detachedFromSeries: false,
      thumbnailUrl: null,
    });
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReattachEpisodeMutation(), { wrapper });

    result.current.mutate({ seriesId: 'series-1', eventId: 'evt-2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(seriesService.reattachEpisode).toHaveBeenCalledWith('series-1', 'evt-2');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: seriesKeys.episodes('series-1') });
  });
});

describe('useCreateSeriesTicketProductMutation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invalidates the series ticket products on settle', async () => {
    vi.mocked(seriesService.createTicketProduct).mockResolvedValue({
      id: 'prod-1',
      seriesId: 'series-1',
      name: 'Passe',
      description: 'Passe da temporada',
      price: 100,
      currency: 'BRL',
      capabilities: ['LIVE_VIEW'],
      camerasLimit: null,
      allowedStageIds: [],
      capacity: null,
      sold: 0,
      immutable: false,
    });
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateSeriesTicketProductMutation(), { wrapper });

    result.current.mutate({
      seriesId: 'series-1',
      input: {
        name: 'Passe',
        description: 'Passe da temporada',
        price: 100,
        currency: 'BRL',
        capabilities: ['LIVE_VIEW'],
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: seriesKeys.ticketProducts('series-1'),
    });
  });
});
