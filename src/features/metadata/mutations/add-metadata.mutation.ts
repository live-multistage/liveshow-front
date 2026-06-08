'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { metadataService } from '../services/metadata.service';
import { metadataKeys } from '../queries/use-event-metadata';
import type { AddMetadataRequest } from '../types/metadata.types';

export function useAddMetadataMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<AddMetadataRequest, 'ownerType' | 'ownerId'>) =>
      metadataService.add({ ownerType: 'EVENT', ownerId: eventId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metadataKeys.eventMetadata(eventId) });
    },
  });
}
