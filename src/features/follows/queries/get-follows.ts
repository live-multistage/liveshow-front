'use client';

import { useQuery } from '@tanstack/react-query';
import type { FollowTargetType } from '@live-show/api-contracts';
import { useAuth } from '@/features/account/hooks/use-auth';
import { followsService } from '../services/follows.service';

export const followKeys = {
  all: ['follows'] as const,
  ids: (targetType: FollowTargetType) => ['follows', 'ids', targetType] as const,
  list: (targetType: FollowTargetType) => ['follows', 'list', targetType] as const,
  count: (targetType: FollowTargetType, targetId: string) =>
    ['follows', 'count', targetType, targetId] as const,
};

// Same auth-hydration guard as wishlist: never fire while the token is still
// loading, or the request races tokenStore and comes back 401.
export function useFollowIdsQuery(targetType: FollowTargetType, options?: { enabled?: boolean }) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: followKeys.ids(targetType),
    queryFn: () => followsService.listIds(targetType),
    enabled: !isLoading && isLoggedIn && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useFollowListQuery(targetType: FollowTargetType, options?: { enabled?: boolean }) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: followKeys.list(targetType),
    queryFn: () => followsService.list(targetType),
    enabled: !isLoading && isLoggedIn && options?.enabled !== false,
    staleTime: 30_000,
  });
}

// Public endpoint: no auth gating needed.
export function useFollowCountQuery(
  targetType: FollowTargetType,
  targetId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: followKeys.count(targetType, targetId),
    queryFn: () => followsService.count(targetType, targetId),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}
