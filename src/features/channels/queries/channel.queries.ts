'use client';

import { useQuery } from '@tanstack/react-query';
import { channelService } from '../services/channel.service';

export const channelKeys = {
  all: ['channels'] as const,
  list: ['channels', 'list'] as const,
  detail: (slug: string) => ['channels', 'detail', slug] as const,
  schedule: (slug: string, day?: string) => ['channels', 'schedule', slug, day] as const,
  org: (organizationId: string) => ['channels', 'org', organizationId] as const,
};

export function useChannelsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.list,
    queryFn: () => channelService.list(),
    enabled: options?.enabled !== false,
  });
}

export function useChannelQuery(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.detail(slug),
    queryFn: () => channelService.getBySlug(slug),
    enabled: options?.enabled !== false,
    // O painel ao vivo depende do "current"/"next" ficarem frescos sem o
    // usuário recarregar a página.
    refetchInterval: 60_000,
  });
}

export function useChannelScheduleQuery(
  slug: string,
  day?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: channelKeys.schedule(slug, day),
    queryFn: () => channelService.schedule(slug, day),
    enabled: options?.enabled !== false,
  });
}

export function useOrgChannelsQuery(organizationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.org(organizationId),
    queryFn: () => channelService.listByOrg(organizationId),
    enabled: options?.enabled !== false,
  });
}
