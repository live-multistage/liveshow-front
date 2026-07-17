'use client';

import { useQuery } from '@tanstack/react-query';
import { advertisementsService } from '../services/advertisements.service';

// Advertiser-facing review history — used to surface the rejection reason so
// the org knows what to fix before resubmitting.
export function useAdReviewsQuery(adId: string, enabled = true) {
  return useQuery({
    queryKey: ['ad-reviews', adId] as const,
    queryFn: () => advertisementsService.getReviews(adId),
    enabled,
    staleTime: 30_000,
  });
}
