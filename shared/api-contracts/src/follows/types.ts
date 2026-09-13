export type FollowTargetType = 'ARTIST' | 'ORGANIZATION';

export interface FollowRequest {
  targetType: FollowTargetType;
  targetId: string;
}

export interface FollowItem {
  id: string;
  targetType: FollowTargetType;
  targetId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface FollowListResponse {
  items: FollowItem[];
}

export interface FollowIdsResponse {
  ids: string[];
}

export interface FollowCountResponse {
  count: number;
}

export interface FollowResponse {
  following: boolean;
}
