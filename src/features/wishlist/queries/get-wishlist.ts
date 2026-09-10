'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/account/hooks/use-auth';
import { wishlistService } from '../services/wishlist.service';

export const wishlistKeys = {
  all: ['wishlist'] as const,
  list: ['wishlist', 'list'] as const,
  ids: ['wishlist', 'ids'] as const,
};

// User-scoped: never fire until auth has hydrated (`!isLoading`) AND the user
// is logged in. Firing during hydration races the token — the request goes out
// before tokenStore is populated → 401 (the interceptor won't refresh with an
// empty token). isLoading flips to false only after the token is set.
export function useWishlistQuery(options?: { enabled?: boolean }) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: wishlistKeys.list,
    queryFn: () => wishlistService.list(),
    enabled: !isLoading && isLoggedIn && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useWishlistIdsQuery(options?: { enabled?: boolean }) {
  const { isLoggedIn, isLoading } = useAuth();
  return useQuery({
    queryKey: wishlistKeys.ids,
    queryFn: () => wishlistService.listIds(),
    enabled: !isLoading && isLoggedIn && options?.enabled !== false,
    // Todo botão de coração de toda página lê daqui — barato e compartilhado.
    staleTime: 60_000,
  });
}
