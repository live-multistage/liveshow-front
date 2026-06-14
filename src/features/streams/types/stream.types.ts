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

// ── Ingest credentials (admin view, returned by camera ingest endpoints) ──
export interface IngestConnection {
  protocol: 'srt';
  url: string;
  host: string;
  port: number;
  latency: number;
  streamId: string;
}

export interface CameraIngestResponse extends CameraResponse {
  streamKey: string;
  ingest: IngestConnection;
}

// ── Live ingest status (GET /feeds/:feedId/ingest) ──
export interface IngestSessionInfo {
  id: string;
  status: string;
  startedAt: string;
  remoteAddr: string | null;
}

export interface FeedCameraIngest {
  id: string;
  name: string;
  slug: string;
  priority: number;
  enabled: boolean;
  live: boolean;
  session: IngestSessionInfo | null;
}

export interface FeedIngestResponse {
  feed: FeedResponse;
  cameras: FeedCameraIngest[];
}

// ── Transcode job (GET /transcode/cameras/:cameraId/job) ──
export type TranscodeStatus = 'PENDING' | 'RUNNING' | 'ENDED' | 'FAILED';

export interface TranscodeRendition {
  label: string;
  width: number;
  height: number;
  bitrateKbps: number;
  fps: number;
  codec: string;
  gop: number;
}

export interface TranscodeJobResponse {
  id: string;
  streamId: string;
  cameraId: string;
  packageId: string;
  status: TranscodeStatus;
  pid: number | null;
  error: string | null;
  originDir: string;
  segmentDurationSec: number;
  gopDurationSec: number;
  renditions: TranscodeRendition[];
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

// ── Stream update ──
export interface UpdateStreamRequest {
  title?: string;
  description?: string;
}
