export type StreamStatus = 'DRAFT' | 'READY' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface StreamResponse {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  status: StreamStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StageResponse {
  id: string;
  streamId: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  id: string;
  stageId: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CameraResponse {
  id: string;
  feedId: string;
  name: string;
  slug: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStreamRequest {
  title: string;
  description?: string;
}

export interface CreateStageRequest {
  name: string;
  description?: string;
}

export interface CreateFeedRequest {
  name: string;
  description?: string;
}

export interface CreateCameraRequest {
  name: string;
  priority?: number;
}
