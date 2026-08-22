import { httpClient } from '@/lib/http/client';
import type {
  Channel,
  ChannelListItem,
  ChannelPlaybackResponse,
  ChannelSubscriptionSummary,
  CreateChannelInput,
  OrgChannel,
  Program,
  PublicChannel,
  ScheduledSlot,
  SubscriptionInterval,
  UpdateChannelInput,
  UpsertProgramInput,
} from '../types/channel.types';

export const channelService = {
  list: async (): Promise<ChannelListItem[]> => {
    const { data } = await httpClient.get<ChannelListItem[]>('/channels');
    return data;
  },

  getBySlug: async (slug: string): Promise<PublicChannel> => {
    const { data } = await httpClient.get<PublicChannel>(`/channels/${slug}`);
    return data;
  },

  schedule: async (slug: string, dayISO?: string): Promise<ScheduledSlot[]> => {
    const { data } = await httpClient.get<ScheduledSlot[]>(`/channels/${slug}/schedule`, {
      params: dayISO ? { day: dayISO } : undefined,
    });
    return data;
  },

  // Resolved playback for what the channel is currently showing — its own
  // feed or a carried event. Replaces the event playback route for channels.
  getPlayback: async (slug: string): Promise<ChannelPlaybackResponse> => {
    const { data } = await httpClient.get<ChannelPlaybackResponse>(`/channels/${slug}/playback`);
    return data;
  },

  listByOrg: async (organizationId: string): Promise<OrgChannel[]> => {
    const { data } = await httpClient.get<OrgChannel[]>(`/organizations/${organizationId}/channels`);
    return data;
  },

  getOrgById: async (id: string): Promise<OrgChannel> => {
    const { data } = await httpClient.get<OrgChannel>(`/channels/by-id/${id}`);
    return data;
  },

  create: async (input: CreateChannelInput): Promise<OrgChannel> => {
    const { data } = await httpClient.post<OrgChannel>('/channels', input);
    return data;
  },

  update: async (id: string, input: UpdateChannelInput): Promise<OrgChannel> => {
    const { data } = await httpClient.patch<OrgChannel>(`/channels/${id}`, input);
    return data;
  },

  publish: async (id: string): Promise<OrgChannel> => {
    const { data } = await httpClient.post<OrgChannel>(`/channels/${id}/publish`);
    return data;
  },

  archive: async (id: string): Promise<OrgChannel> => {
    const { data } = await httpClient.post<OrgChannel>(`/channels/${id}/archive`);
    return data;
  },

  syncPricing: async (id: string): Promise<OrgChannel> => {
    const { data } = await httpClient.post<OrgChannel>(`/channels/${id}/pricing/sync`);
    return data;
  },

  subscriptionSummary: async (id: string): Promise<ChannelSubscriptionSummary> => {
    const { data } = await httpClient.get<ChannelSubscriptionSummary>(
      `/channels/${id}/subscriptions/summary`,
    );
    return data;
  },

  uploadCover: async (id: string, file: File): Promise<OrgChannel> => {
    const formData = new FormData();
    formData.append('file', file);
    // Content negotiation for multipart depends on the runtime's FormData
    // being recognized by axios's isFormData check, which is realm-sensitive
    // (fails under jsdom); passthrough transformRequest sidesteps that
    // instead of relying on detection.
    const { data } = await httpClient.post<OrgChannel>(`/channels/${id}/cover`, formData, {
      transformRequest: (payload) => payload,
    });
    return data;
  },

  listPrograms: async (channelId: string): Promise<Program[]> => {
    const { data } = await httpClient.get<Program[]>(`/channels/${channelId}/programs`);
    return data;
  },

  upsertProgram: async (
    channelId: string,
    input: UpsertProgramInput,
    programId?: string,
  ): Promise<Program> => {
    const url = programId
      ? `/channels/${channelId}/programs/${programId}`
      : `/channels/${channelId}/programs`;
    const { data } = programId
      ? await httpClient.patch<Program>(url, input)
      : await httpClient.post<Program>(url, input);
    return data;
  },

  deleteProgram: async (channelId: string, programId: string): Promise<void> => {
    await httpClient.delete(`/channels/${channelId}/programs/${programId}`);
  },

  subscribe: async (
    id: string,
    interval: SubscriptionInterval,
  ): Promise<{ url: string }> => {
    const { data } = await httpClient.post<{ url: string }>(`/channels/${id}/subscribe`, {
      interval,
    });
    return data;
  },
};
