export interface LiveCamera {
  cameraId: string;
  name: string;
  slug: string;
  priority: number;
  // e.g. '/origin/<pkg>/master.m3u8' (relative to API base). Null while the
  // camera is broadcasting but not yet transcoding (a viewer hasn't
  // triggered the first start yet, or it's still spinning up) — the camera
  // is selectable, the player should show a connecting state and this
  // becomes non-null once the backend's queue processor promotes the job.
  manifestPath: string | null;
  // e.g. '/ll/<streamKey>/index.m3u8?token=...' — only set on LOW-latency
  // events (see LivePlaybackResponse.latencyMode). Null on STANDARD events
  // and while not yet transcoding.
  llPath: string | null;
}

export interface LiveStage {
  stageId: string;
  name: string;
  slug: string;
  position: number;
  cameras: LiveCamera[];
}

export interface LivePlaybackResponse {
  eventId: string;
  live: boolean;
  // Grouped by stage when the backend supports it.
  // Falls back to wrapping `cameras` into a single synthetic stage when absent.
  stages?: LiveStage[];
  cameras: LiveCamera[]; // flat list — always present for backward compat
  primaryCameraId: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none).
  librasCameraId: string | null;
  latencyMode: 'STANDARD' | 'LOW';
}

export interface LiveAccessResponse {
  authorized: boolean;
}

export interface ReplayCameraPlayback {
  cameraId: string;
  name: string;
  slug: string;
  priority: number;
  // e.g. '/packages/<packageId>/replay/master.m3u8' (relative to API base).
  // Null when this camera has no archived, replayable broadcast yet.
  replayPath: string | null;
}

export interface ReplayStagePlayback {
  stageId: string;
  name: string;
  slug: string;
  position: number;
  cameras: ReplayCameraPlayback[];
}

export interface ReplayPlaybackResponse {
  eventId: string;
  available: boolean;
  stages: ReplayStagePlayback[];
  cameras: ReplayCameraPlayback[];
  primaryCameraId: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none/VOD).
  librasCameraId: string | null;
}
