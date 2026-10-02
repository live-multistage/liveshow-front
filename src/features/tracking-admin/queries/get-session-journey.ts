'use client';

import { useQuery } from '@tanstack/react-query';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useSessionJourneyQuery(sessionId: string, anonymousId: string) {
  return useQuery({
    queryKey: trackingAdminKeys.sessionJourney(sessionId, anonymousId),
    queryFn: () => trackingAdminService.getSessionJourney(sessionId, anonymousId),
    enabled: sessionId !== '' && anonymousId !== '',
    staleTime: 30_000,
  });
}
