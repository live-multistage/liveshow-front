import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

export const advertisementsService = {
  serve: async (placement: AdPlacement, limit = 1): Promise<ServedAd[]> => {
    // Pré-roll segura o player: um serve pendurado não pode travar a entrada
    // ao vivo/replay, então falha rápido e deixa o hook cair no caminho de erro.
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', {
      params: { placement, limit },
      timeout: 5000,
    });
    return data;
  },

  recordImpression: (adId: string, placement: AdPlacement): void => {
    httpClient.post(`/ads/serve/${adId}/impression`, undefined, { params: { placement } }).catch(() => {});
  },

  recordClick: (adId: string, placement: AdPlacement): void => {
    httpClient.post(`/ads/serve/${adId}/click`, undefined, { params: { placement } }).catch(() => {});
  },
};
