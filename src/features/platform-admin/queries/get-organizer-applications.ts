'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const ORGANIZER_APPLICATIONS_KEY = (status?: string) =>
  ['platform-admin', 'organizer-applications', status] as const;

export function useOrganizerApplicationsQuery(status?: string) {
  return useQuery({
    queryKey: ORGANIZER_APPLICATIONS_KEY(status),
    queryFn: () => platformAdminService.listOrganizerApplications(status),
    staleTime: 30_000,
  });
}
