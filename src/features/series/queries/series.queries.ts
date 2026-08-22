'use client';

import { useQuery } from '@tanstack/react-query';
import { seriesService } from '../services/series.service';

export const seriesKeys = {
  all: ['series'] as const,
  list: ['series', 'list'] as const,
  detail: (slug: string) => ['series', 'detail', slug] as const,
  org: (organizationId: string) => ['series', 'org', organizationId] as const,
  episodes: (seriesId: string) => ['series', 'episodes', seriesId] as const,
  ticketProducts: (seriesId: string) => ['series', 'ticket-products', seriesId] as const,
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

export function useOrgSeriesQuery(organizationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: seriesKeys.org(organizationId),
    queryFn: () => seriesService.listByOrg(organizationId),
    enabled: options?.enabled !== false && !!organizationId,
  });
}

export function useSeriesEpisodesQuery(seriesId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: seriesKeys.episodes(seriesId),
    queryFn: () => seriesService.listEpisodes(seriesId),
    enabled: options?.enabled !== false && !!seriesId,
  });
}

export function useSeriesTicketProductsQuery(seriesId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: seriesKeys.ticketProducts(seriesId),
    queryFn: () => seriesService.listTicketProducts(seriesId),
    enabled: options?.enabled !== false && !!seriesId,
  });
}
