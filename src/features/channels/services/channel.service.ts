import { httpClient } from '@/lib/http/client';
import type {
  Channel,
  ChannelListItem,
  CreateChannelInput,
  Program,
  PublicChannel,
  ScheduledSlot,
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

  listByOrg: async (organizationId: string): Promise<Channel[]> => {
    const { data } = await httpClient.get<Channel[]>(`/organizations/${organizationId}/channels`);
    return data;
  },

  create: async (input: CreateChannelInput): Promise<Channel> => {
    const { data } = await httpClient.post<Channel>('/channels', input);
    return data;
  },

  update: async (id: string, input: UpdateChannelInput): Promise<Channel> => {
    const { data } = await httpClient.patch<Channel>(`/channels/${id}`, input);
    return data;
  },

  publish: async (id: string): Promise<Channel> => {
    const { data } = await httpClient.post<Channel>(`/channels/${id}/publish`);
    return data;
  },

  archive: async (id: string): Promise<Channel> => {
    const { data } = await httpClient.post<Channel>(`/channels/${id}/archive`);
    return data;
  },

  uploadCover: async (id: string, file: File): Promise<Channel> => {
    const formData = new FormData();
    formData.append('file', file);
    // Content negotiation for multipart depends on the runtime's FormData
    // being recognized by axios's isFormData check, which is realm-sensitive
    // (fails under jsdom); passthrough transformRequest sidesteps that
    // instead of relying on detection.
    const { data } = await httpClient.post<Channel>(`/channels/${id}/cover`, formData, {
      transformRequest: (payload) => payload,
    });
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
};
