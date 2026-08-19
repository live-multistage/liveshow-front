'use client';

import { useQuery } from '@tanstack/react-query';
import { wishlistService } from '../services/wishlist.service';

export const wishlistKeys = {
  all: ['wishlist'] as const,
  list: ['wishlist', 'list'] as const,
  ids: ['wishlist', 'ids'] as const,
};

export function useWishlistQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: wishlistKeys.list,
    queryFn: () => wishlistService.list(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useWishlistIdsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: wishlistKeys.ids,
    queryFn: () => wishlistService.listIds(),
    enabled: options?.enabled !== false,
    // Todo botão de coração de toda página lê daqui — barato e compartilhado.
    staleTime: 60_000,
  });
}
