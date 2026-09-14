'use client';

import { useQuery } from '@tanstack/react-query';
import { blueprintsService } from '../services/blueprints.service';
import { blueprintKeys } from './blueprints.queries';

// Names only — GET /blueprints/secrets never returns the value. Used by the
// secret select and the keyValueList row picker (headers, etc.) to offer
// `{{secrets.NAME}}` alongside upstream node fields.
export function useBlueprintSecretsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: blueprintKeys.secrets(),
    queryFn: blueprintsService.listSecrets,
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}
