'use client';

import { useQuery } from '@tanstack/react-query';
import { getVodAsset } from '../services/vod.service';

export const vodAssetKey = (eventId: string) => ['events', 'vod', eventId] as const;

export function useVodAsset(eventId: string) {
  return useQuery({
    queryKey: vodAssetKey(eventId),
    queryFn: () => getVodAsset(eventId),
    enabled: !!eventId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'UPLOADED' || status === 'PROCESSING' ? 5000 : false;
    },
  });
}
