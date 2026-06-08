'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { metadataService } from '../services/metadata.service';
import { metadataKeys } from '../queries/use-event-metadata';

export function useDeleteMetadataMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => metadataService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metadataKeys.eventMetadata(eventId) });
    },
  });
}
