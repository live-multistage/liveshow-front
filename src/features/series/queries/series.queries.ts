'use client';

import { useQuery } from '@tanstack/react-query';
import { seriesService } from '../services/series.service';

export const seriesKeys = {
  all: ['series'] as const,
  list: ['series', 'list'] as const,
  detail: (slug: string) => ['series', 'detail', slug] as const,
};

export function useSeriesListQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: seriesKeys.list,
    queryFn: () => seriesService.list(),
    enabled: options?.enabled !== false,
  });
}

export function useSeriesQuery(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: seriesKeys.detail(slug),
    queryFn: () => seriesService.getBySlug(slug),
    enabled: options?.enabled !== false && !!slug,
  });
}
