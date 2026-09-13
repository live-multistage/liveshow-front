import { httpClient } from '@/lib/http/client';
import type {
  FollowCountResponse,
  FollowIdsResponse,
  FollowItem,
  FollowListResponse,
  FollowResponse,
  FollowTargetType,
} from '@live-show/api-contracts';

export const followsService = {
  list: async (targetType: FollowTargetType): Promise<FollowItem[]> => {
    const { data } = await httpClient.get<FollowListResponse>('/me/follows', {
      params: { targetType },
    });
    return data.items;
  },

  listIds: async (targetType: FollowTargetType): Promise<string[]> => {
    const { data } = await httpClient.get<FollowIdsResponse>('/me/follows/ids', {
      params: { targetType },
    });
    return data.ids;
  },

  follow: async (targetType: FollowTargetType, targetId: string): Promise<void> => {
    await httpClient.post<FollowResponse>('/me/follows', { targetType, targetId });
  },

  unfollow: async (targetType: FollowTargetType, targetId: string): Promise<void> => {
    await httpClient.delete(`/me/follows/${targetType}/${targetId}`);
  },

  count: async (targetType: FollowTargetType, targetId: string): Promise<number> => {
    const { data } = await httpClient.get<FollowCountResponse>(
      `/follows/${targetType}/${targetId}/count`,
    );
    return data.count;
  },
};
