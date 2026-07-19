import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

// Advertiser-side CRUD (create/update/status/report/banner upload) moved to
// the external Ads Manager. Only serving + engagement tracking stay here.
export const advertisementsService = {
  serve: async (placement: AdPlacement, limit = 1): Promise<ServedAd[]> => {
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', { params: { placement, limit } });
    return data;
  },

  recordImpression: (adId: string): void => {
    httpClient.post(`/ads/serve/${adId}/impression`).catch(() => {});
  },

  recordClick: (adId: string): void => {
    httpClient.post(`/ads/serve/${adId}/click`).catch(() => {});
  },
};
