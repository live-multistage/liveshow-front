'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const ARTIST_APPLICATIONS_KEY = (status?: string) =>
  ['platform-admin', 'artist-applications', status] as const;

export function useArtistApplicationsQuery(status?: string) {
  return useQuery({
    queryKey: ARTIST_APPLICATIONS_KEY(status),
    queryFn: () => platformAdminService.listArtistApplications(status),
    staleTime: 30_000,
  });
}
