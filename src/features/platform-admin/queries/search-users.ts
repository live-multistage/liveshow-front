'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export const SEARCH_USERS_KEY = (query: string) => ['platform-admin', 'users', 'search', query] as const;

export function useSearchUsersQuery(query: string) {
  return useQuery({
    queryKey: SEARCH_USERS_KEY(query),
    queryFn: () => platformAdminService.searchUsers(query),
    enabled: query.trim().length > 0,
  });
}
