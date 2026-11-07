import { httpClient } from '@/lib/http/client';
import { getAdSessionId } from '../utils/ad-session';
import type { ServedAd, AdPlacement, AdEventType } from '../types/advertisement.types';

export const advertisementsService = {
  // eventId is REQUIRED by the API for PRE_ROLL / PLAYER_PAUSE — it is what
  // attributes the revenue share to the organizer whose event is playing.
  serve: async (placement: AdPlacement, limit = 1, eventId?: string): Promise<ServedAd[]> => {
    // Pré-roll segura o player: um serve pendurado não pode travar a entrada
    // ao vivo/replay, então falha rápido e deixa o hook cair no caminho de erro.
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', {
      params: { placement, limit, sessionId: getAdSessionId(), ...(eventId ? { eventId } : {}) },
      timeout: 5000,
    });
    return data;
  },

  recordImpression: (servedId: string): void => {
    httpClient.post(`/ads/serve/${servedId}/impression`).catch(() => {});
  },

  // Engajamento de vídeo e pausa. Fire-and-forget: falha não pode atrapalhar o player.
  recordEvent: (servedId: string, type: AdEventType): void => {
    httpClient.post(`/ads/serve/${servedId}/event`, { type }).catch(() => {});
  },

  recordClick: (servedId: string): void => {
    httpClient.post(`/ads/serve/${servedId}/click`).catch(() => {});
  },
};
