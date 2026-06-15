export interface LiveCamera {
  cameraId: string;
  name: string;
  slug: string;
  priority: number;
  manifestPath: string; // e.g. '/origin/<pkg>/master.m3u8' (relative to API base)
}

export interface LivePlaybackResponse {
  eventId: string;
  live: boolean;
  cameras: LiveCamera[];
  primaryCameraId: string | null;
}

export interface LiveAccessResponse {
  authorized: boolean;
}
