'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { houseAdsService } from '../services/house-ads.service';
import { houseAdsKeys } from '../queries/house-ads.queries';
import type {
  CreateHouseAdRequest,
  CreateHouseAdResponse,
  HouseAdStatusAction,
  UpdateHouseAdRequest,
  UploadHouseAdBannerResponse,
  UploadHouseAdVideoResponse,
} from '../types/house-ads.types';

const wrap = <A, R>(fn: (a: A) => Promise<R>) => async (a: A) => {
  try {
    return await fn(a);
  } catch (err) {
    throw normalizeError(err);
  }
};

function invalidateHouseAds(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: houseAdsKeys.all });
  qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
}

export function useCreateHouseAdMutation() {
  const qc = useQueryClient();
  return useMutation<CreateHouseAdResponse, AppError, CreateHouseAdRequest>({
    mutationFn: wrap(houseAdsService.create),
    onSuccess: () => invalidateHouseAds(qc),
  });
}

export function useUpdateHouseAdMutation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, AppError, { id: string; payload: UpdateHouseAdRequest }>({
    mutationFn: wrap(({ id, payload }) => houseAdsService.update(id, payload)),
    onSuccess: () => invalidateHouseAds(qc),
  });
}

export function useUploadHouseAdBannerMutation() {
  const qc = useQueryClient();
  return useMutation<UploadHouseAdBannerResponse, AppError, { id: string; file: File }>({
    mutationFn: wrap(({ id, file }) => houseAdsService.uploadBanner(id, file)),
    onSuccess: () => invalidateHouseAds(qc),
  });
}

export function useUploadHouseAdVideoMutation() {
  const qc = useQueryClient();
  return useMutation<UploadHouseAdVideoResponse, AppError, { id: string; file: File }>({
    mutationFn: wrap(({ id, file }) => houseAdsService.uploadVideo(id, file)),
    onSuccess: () => invalidateHouseAds(qc),
  });
}

export function useChangeHouseAdStatusMutation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, AppError, { id: string; action: HouseAdStatusAction }>({
    mutationFn: wrap(({ id, action }) => houseAdsService.changeStatus(id, action)),
    onSuccess: () => invalidateHouseAds(qc),
  });
}
