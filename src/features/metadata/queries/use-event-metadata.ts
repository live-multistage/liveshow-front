'use client';

import { useQuery } from '@tanstack/react-query';
import { metadataService } from '../services/metadata.service';

export const metadataKeys = {
  eventMetadata: (eventId: string) => ['metadata', 'EVENT', eventId] as const,
};

export function useEventMetadataQuery(eventId: string) {
  return useQuery({
    queryKey: metadataKeys.eventMetadata(eventId),
    queryFn: () => metadataService.list('EVENT', eventId),
    enabled: !!eventId,
  });
}
