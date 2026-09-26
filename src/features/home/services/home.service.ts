import { httpClient } from '@/lib/http/client';
import type { HomeRailsResponse } from '@live-show/api-contracts';

export const homeService = {
  rails: async (params: { cursor?: string; limit?: number } = {}): Promise<HomeRailsResponse> => {
    const { data } = await httpClient.get<HomeRailsResponse>('/home/rails', {
      params: { cursor: params.cursor, limit: params.limit ?? 4 },
    });
    return data;
  },
};
