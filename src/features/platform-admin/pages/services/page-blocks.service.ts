import { httpClient } from '@/lib/http/client';
import type { CreatePageBlockRequest, PageBlockListResponse, PageBlockResponse } from '@live-show/api-contracts';

export const pageBlocksService = {
  list: async () => (await httpClient.get<PageBlockListResponse>('/platform/page-blocks')).data.items,
  create: async (body: CreatePageBlockRequest) => (await httpClient.post<PageBlockResponse>('/platform/page-blocks', body)).data,
};
