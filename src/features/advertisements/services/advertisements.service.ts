import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

export const advertisementsService = {
  serve: async (placement: AdPlacement, limit = 1): Promise<ServedAd[]> => {
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', { params: { placement, limit } });
    return data;
  },

  recordImpression: (adId: string, placement: AdPlacement): void => {
    httpClient.post(`/ads/serve/${adId}/impression`, undefined, { params: { placement } }).catch(() => {});
  },

  recordClick: (adId: string, placement: AdPlacement): void => {
    httpClient.post(`/ads/serve/${adId}/click`, undefined, { params: { placement } }).catch(() => {});
  },
};
