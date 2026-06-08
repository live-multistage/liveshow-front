'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { metadataService } from '../services/metadata.service';
import { metadataKeys } from '../queries/use-event-metadata';
import type { UpdateMetadataRequest } from '../types/metadata.types';

export function useUpdateMetadataMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMetadataRequest }) =>
      metadataService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metadataKeys.eventMetadata(eventId) });
    },
  });
}
