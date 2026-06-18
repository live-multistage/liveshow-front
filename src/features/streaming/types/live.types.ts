export interface LiveCamera {
  cameraId: string;
  name: string;
  slug: string;
  priority: number;
  manifestPath: string; // e.g. '/origin/<pkg>/master.m3u8' (relative to API base)
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
}

export interface LiveAccessResponse {
  authorized: boolean;
}
