vi.mock('../services/house-ads.service', () => ({
  houseAdsService: {
    create: vi.fn(),
    update: vi.fn(),
    uploadBanner: vi.fn(),
    uploadVideo: vi.fn(),
    changeStatus: vi.fn(),
  },
}));

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useChangeHouseAdStatusMutation,
  useCreateHouseAdMutation,
  useUpdateHouseAdMutation,
  useUploadHouseAdBannerMutation,
  useUploadHouseAdVideoMutation,
} from './house-ads.mutations';
import { houseAdsKeys } from '../queries/house-ads.queries';
import { houseAdsService } from '../services/house-ads.service';
import type { CreateHouseAdRequest } from '../types/house-ads.types';

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const createPayload: CreateHouseAdRequest = {
  title: 'Show it off',
  format: 'HORIZONTAL_728x90',
  placements: ['FEED'],
  targetDomains: [],
  targetCategories: [],
  housePriority: 'FILL',
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-10-31T00:00:00.000Z',
};

describe('house ads mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create invalidates the house-ads cache and the audit log on success', async () => {
    vi.mocked(houseAdsService.create).mockResolvedValue({ id: 'ad-1', status: 'DRAFT', housePriority: 'FILL' });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateHouseAdMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate(createPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.create).toHaveBeenCalledWith(createPayload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: houseAdsKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['platform-admin', 'audit'] });
  });

  it('update invalidates the house-ads cache on success', async () => {
    vi.mocked(houseAdsService.update).mockResolvedValue({ ok: true });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateHouseAdMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate({ id: 'ad-1', payload: { title: 'New title' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.update).toHaveBeenCalledWith('ad-1', { title: 'New title' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: houseAdsKeys.all });
  });

  it('uploadBanner invalidates the house-ads cache on success', async () => {
    vi.mocked(houseAdsService.uploadBanner).mockResolvedValue({ bannerUrl: 'https://cdn/x.png' });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const file = new File(['x'], 'banner.png', { type: 'image/png' });

    const { result } = renderHook(() => useUploadHouseAdBannerMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate({ id: 'ad-1', file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.uploadBanner).toHaveBeenCalledWith('ad-1', file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: houseAdsKeys.all });
  });

  it('uploadVideo invalidates the house-ads cache on success', async () => {
    vi.mocked(houseAdsService.uploadVideo).mockResolvedValue({ videoUrl: 'https://cdn/x.mp4', videoDurationSec: 12 });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const file = new File(['x'], 'ad.mp4', { type: 'video/mp4' });

    const { result } = renderHook(() => useUploadHouseAdVideoMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate({ id: 'ad-1', file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.uploadVideo).toHaveBeenCalledWith('ad-1', file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: houseAdsKeys.all });
  });

  it('changeStatus invalidates the house-ads cache on success', async () => {
    vi.mocked(houseAdsService.changeStatus).mockResolvedValue({ ok: true });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useChangeHouseAdStatusMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate({ id: 'ad-1', action: 'pause' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(houseAdsService.changeStatus).toHaveBeenCalledWith('ad-1', 'pause');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: houseAdsKeys.all });
  });

  it('propagates a normalized AppError on failure', async () => {
    vi.mocked(houseAdsService.create).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Invalid placements for format' } },
    });
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useCreateHouseAdMutation(), { wrapper: wrapper(queryClient) });
    result.current.mutate(createPayload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 422, message: 'Invalid placements for format' });
  });
});
