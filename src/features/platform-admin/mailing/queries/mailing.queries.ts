'use client';

import { useQuery } from '@tanstack/react-query';
import type { AudienceCountRequest } from '@live-show/api-contracts';
import { mailingService } from '../services/mailing.service';

export const mailingKeys = {
  all: ['platform-admin', 'mailing'] as const,
  templates: () => [...mailingKeys.all, 'templates'] as const,
  template: (id: string) => [...mailingKeys.all, 'template', id] as const,
  campaigns: () => [...mailingKeys.all, 'campaigns'] as const,
  campaign: (id: string) => [...mailingKeys.all, 'campaign', id] as const,
  audienceCount: (req: AudienceCountRequest) => [...mailingKeys.all, 'audience-count', req] as const,
};

export function useMailingTemplatesQuery() {
  return useQuery({ queryKey: mailingKeys.templates(), queryFn: mailingService.listTemplates, staleTime: 30_000 });
}

export function useMailingTemplateQuery(id: string | null) {
  return useQuery({ queryKey: mailingKeys.template(id ?? 'new'), queryFn: () => mailingService.getTemplate(id as string), enabled: id !== null });
}

export function useMailingCampaignsQuery() {
  return useQuery({ queryKey: mailingKeys.campaigns(), queryFn: mailingService.listCampaigns, staleTime: 15_000 });
}

// Live progress while a campaign is in flight (spec §4 detail).
export function useMailingCampaignQuery(id: string) {
  return useQuery({
    queryKey: mailingKeys.campaign(id),
    queryFn: () => mailingService.getCampaign(id),
    refetchInterval: (q) => (['SCHEDULED', 'SENDING'].includes(q.state.data?.status ?? '') ? 30_000 : false),
  });
}

export function useAudienceCountQuery(req: AudienceCountRequest | null) {
  return useQuery({
    queryKey: req ? mailingKeys.audienceCount(req) : [...mailingKeys.all, 'audience-count', 'none'],
    queryFn: () => mailingService.countAudience(req as AudienceCountRequest),
    enabled: req !== null,
    staleTime: 60_000,
  });
}
