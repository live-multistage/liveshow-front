'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useTrackingUserQuery(id: string) {
  return useQuery({
    queryKey: trackingAdminKeys.user(id),
    queryFn: () => trackingAdminService.getUser(id),
    staleTime: 30_000,
  });
}

export function useTrackingUserEventsInfiniteQuery(id: string) {
  return useInfiniteQuery({
    queryKey: trackingAdminKeys.userEvents(id),
    queryFn: ({ pageParam }) => trackingAdminService.getUserEvents(id, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
