import axios from 'axios';
import { httpClient } from '@/lib/http/client';
import type {
  StreamResponse, StageResponse, FeedResponse, CameraResponse,
  CreateStreamRequest, CreateStageRequest, CreateFeedRequest, CreateCameraRequest,
  CameraIngestResponse, FeedIngestResponse, TranscodeJobResponse, UpdateStreamRequest,
} from '../types/stream.types';

export const streamsService = {
  // ── Streams ──────────────────────────────────────────────────
  listByEvent: async (eventId: string): Promise<StreamResponse[]> => {
    const { data } = await httpClient.get<StreamResponse[]>(`/events/${eventId}/streams`);
    return data;
  },

  getById: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.get<StreamResponse>(`/streams/${streamId}`);
    return data;
  },

  create: async (eventId: string, payload: CreateStreamRequest): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/events/${eventId}/streams`, payload);
    return data;
  },

  update: async (streamId: string, payload: Partial<CreateStreamRequest>): Promise<StreamResponse> => {
    const { data } = await httpClient.put<StreamResponse>(`/streams/${streamId}`, payload);
    return data;
  },

  // ── Stream update (typed) ──────────────────────────────────────
  updateStream: async (streamId: string, payload: UpdateStreamRequest): Promise<StreamResponse> => {
    const { data } = await httpClient.put<StreamResponse>(`/streams/${streamId}`, payload);
    return data;
  },

  delete: async (streamId: string): Promise<void> => {
    await httpClient.delete(`/streams/${streamId}`);
  },

  // ── Lifecycle ─────────────────────────────────────────────────
  prepare: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/streams/${streamId}/prepare`);
    return data;
  },

  start: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/streams/${streamId}/start`);
    return data;
  },

  end: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/streams/${streamId}/end`);
    return data;
  },

  cancel: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/streams/${streamId}/cancel`);
    return data;
  },

  rollback: async (streamId: string): Promise<StreamResponse> => {
    const { data } = await httpClient.post<StreamResponse>(`/streams/${streamId}/rollback`);
    return data;
  },

  // ── Stages ───────────────────────────────────────────────────
  listStages: async (streamId: string): Promise<StageResponse[]> => {
    const { data } = await httpClient.get<StageResponse[]>(`/streams/${streamId}/stages`);
    return data;
  },

  createStage: async (streamId: string, payload: CreateStageRequest): Promise<StageResponse> => {
    const { data } = await httpClient.post<StageResponse>(`/streams/${streamId}/stages`, payload);
    return data;
  },

  deleteStage: async (stageId: string): Promise<void> => {
    await httpClient.delete(`/stages/${stageId}`);
  },

  // ── Feeds ────────────────────────────────────────────────────
  listFeeds: async (stageId: string): Promise<FeedResponse[]> => {
    const { data } = await httpClient.get<FeedResponse[]>(`/stages/${stageId}/feeds`);
    return data;
  },

  createFeed: async (stageId: string, payload: CreateFeedRequest): Promise<FeedResponse> => {
    const { data } = await httpClient.post<FeedResponse>(`/stages/${stageId}/feeds`, payload);
    return data;
  },

  deleteFeed: async (feedId: string): Promise<void> => {
    await httpClient.delete(`/feeds/${feedId}`);
  },

  // ── Cameras ──────────────────────────────────────────────────
  listCameras: async (feedId: string): Promise<CameraResponse[]> => {
    const { data } = await httpClient.get<CameraResponse[]>(`/feeds/${feedId}/cameras`);
    return data;
  },

  createCamera: async (feedId: string, payload: CreateCameraRequest): Promise<CameraResponse> => {
    const { data } = await httpClient.post<CameraResponse>(`/feeds/${feedId}/cameras`, payload);
    return data;
  },

  enableCamera: async (cameraId: string): Promise<CameraResponse> => {
    const { data } = await httpClient.post<CameraResponse>(`/cameras/${cameraId}/enable`);
    return data;
  },

  disableCamera: async (cameraId: string): Promise<CameraResponse> => {
    const { data } = await httpClient.post<CameraResponse>(`/cameras/${cameraId}/disable`);
    return data;
  },

  // ── Ingest credentials (admin) ─────────────────────────────────
  getCameraIngest: async (cameraId: string): Promise<CameraIngestResponse> => {
    const { data } = await httpClient.get<CameraIngestResponse>(`/cameras/${cameraId}/ingest`);
    return data;
  },

  regenerateCameraKey: async (cameraId: string): Promise<CameraIngestResponse> => {
    const { data } = await httpClient.post<CameraIngestResponse>(`/cameras/${cameraId}/regenerate-key`);
    return data;
  },

  // ── Live ingest status ─────────────────────────────────────────
  getFeedIngest: async (feedId: string): Promise<FeedIngestResponse> => {
    const { data } = await httpClient.get<FeedIngestResponse>(`/feeds/${feedId}/ingest`);
    return data;
  },

  // ── Transcode job for a camera (404 → null) ───────────────────
  getActiveTranscodeJob: async (cameraId: string): Promise<TranscodeJobResponse | null> => {
    try {
      const { data } = await httpClient.get<TranscodeJobResponse>(`/transcode/cameras/${cameraId}/job`);
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  },
};
