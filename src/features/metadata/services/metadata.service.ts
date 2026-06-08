import { httpClient } from '@/lib/http/client';
import type { AddMetadataRequest, MetadataOwnerType, MetadataResponse, UpdateMetadataRequest } from '../types/metadata.types';

export const metadataService = {
  list: async (ownerType: MetadataOwnerType, ownerId: string): Promise<MetadataResponse[]> => {
    const { data } = await httpClient.get<MetadataResponse[]>('/metadata', {
      params: { ownerType, ownerId },
    });
    return data;
  },

  add: async (payload: AddMetadataRequest): Promise<MetadataResponse> => {
    const { data } = await httpClient.post<MetadataResponse>('/metadata', payload);
    return data;
  },

  update: async (id: string, payload: UpdateMetadataRequest): Promise<MetadataResponse> => {
    const { data } = await httpClient.put<MetadataResponse>(`/metadata/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/metadata/${id}`);
  },
};
