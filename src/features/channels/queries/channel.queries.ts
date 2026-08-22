'use client';

import { useQuery } from '@tanstack/react-query';
import { channelService } from '../services/channel.service';

export const channelKeys = {
  all: ['channels'] as const,
  list: ['channels', 'list'] as const,
  detail: (slug: string) => ['channels', 'detail', slug] as const,
  playback: (slug: string) => ['channels', 'playback', slug] as const,
  schedule: (slug: string, day?: string) => ['channels', 'schedule', slug, day] as const,
  org: (organizationId: string) => ['channels', 'org', organizationId] as const,
  orgDetail: (id: string) => ['channels', 'orgDetail', id] as const,
  programs: (channelId: string) => ['channels', 'programs', channelId] as const,
  subscriptionSummary: (channelId: string) =>
    ['channels', 'subscriptionSummary', channelId] as const,
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

// Resolved channel playback — polls every 5s so the player follows the
// simulcast source (own feed <-> a carried event) the same way the event
// live-playback query follows an event going live. staleTime sits just under
// the interval so a remount inside that window reuses the cached response.
export function useChannelPlaybackQuery(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: channelKeys.playback(slug),
    queryFn: () => channelService.getPlayback(slug),
    enabled,
    staleTime: 4_500,
    refetchInterval: enabled ? 5000 : false,
    refetchIntervalInBackground: false,
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
    // Canal em rascunho responde 404 na grade pública — repetir três vezes por
    // coluna só atrasa a tela.
    retry: false,
  });
}

// A grade pública (schedule) só devolve slots — nome e horário de cada
// ocorrência. Para editar um programa é preciso a regra crua, que só existe
// aqui.
export function useChannelProgramsQuery(channelId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.programs(channelId),
    queryFn: () => channelService.listPrograms(channelId),
    enabled: options?.enabled !== false && Boolean(channelId),
  });
}

export function useOrgChannelsQuery(organizationId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.org(organizationId),
    queryFn: () => channelService.listByOrg(organizationId),
    enabled: options?.enabled !== false,
  });
}

// Org-only single-channel read — the only one that carries pricing/
// pricingSynced outside of the org list.
export function useOrgChannelQuery(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: channelKeys.orgDetail(id),
    queryFn: () => channelService.getOrgById(id),
    enabled: options?.enabled !== false && Boolean(id),
  });
}

export function useChannelSubscriptionSummaryQuery(
  channelId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: channelKeys.subscriptionSummary(channelId),
    queryFn: () => channelService.subscriptionSummary(channelId),
    enabled: options?.enabled !== false && Boolean(channelId),
  });
}
