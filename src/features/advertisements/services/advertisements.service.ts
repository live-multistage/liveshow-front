import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

export const advertisementsService = {
  // eventId is REQUIRED by the API for PRE_ROLL / PLAYER_PAUSE — it is what
  // attributes the revenue share to the organizer whose event is playing.
  serve: async (placement: AdPlacement, limit = 1, eventId?: string): Promise<ServedAd[]> => {
    // Pré-roll segura o player: um serve pendurado não pode travar a entrada
    // ao vivo/replay, então falha rápido e deixa o hook cair no caminho de erro.
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', {
      params: { placement, limit, ...(eventId ? { eventId } : {}) },
      timeout: 5000,
    });
    return data;
  },

  recordImpression: (servedId: string): void => {
    httpClient.post(`/ads/serve/${servedId}/impression`).catch(() => {});
  },

  recordClick: (servedId: string): void => {
    httpClient.post(`/ads/serve/${servedId}/click`).catch(() => {});
  },
};
