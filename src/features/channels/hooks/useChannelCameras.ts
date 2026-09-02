'use client';

import { useEventCamerasQuery, useEventStreamsQuery, useIngestPreviewCameras } from '@/features/streams';

export interface ChannelCamera {
  id: string;
  name: string;
  stageName: string;
  /** Recebendo sinal SRT agora (sessão de ingest ativa). */
  live: boolean;
}

/**
 * Câmeras do evento-container do canal, com o estado de sinal que a página de
 * streams já expõe. É a mesma fonte do `/dashboard/streams` — a página do canal
 * só precisa contar e listar.
 */
export function useChannelCameras(broadcastEventId: string): {
  cameras: ChannelCamera[];
  withSignal: number;
  isLoading: boolean;
} {
  const eventId = broadcastEventId || null;
  const { cameras, isLoading } = useEventCamerasQuery(eventId);
  const { data: streams = [] } = useEventStreamsQuery(eventId);
  // O canal tem um único stream contínuo; se um dia tiver mais, o primeiro é o
  // que a página de streams também abre por padrão.
  const streamId = streams[0]?.id ?? null;
  const liveCameras = useIngestPreviewCameras(streamId, Boolean(streamId));
  const liveIds = new Set(liveCameras.map((camera) => camera.cameraId));

  const withContext = cameras.map((camera) => ({
    id: camera.id,
    name: camera.name,
    stageName: camera.stageName,
    live: liveIds.has(camera.id),
  }));

  return {
    cameras: withContext,
    withSignal: withContext.filter((camera) => camera.live).length,
    isLoading,
  };
}
