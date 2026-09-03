export type LatencyMode = 'STANDARD' | 'LOW';

/**
 * A replay manifest stitches a camera's archived packages into one continuous
 * timeline, concatenating them WITHOUT the wall-clock gaps between reconnects.
 * So "local" (stitched) time is not linear in wall-clock ("absolute") time:
 * an outage vanishes from local time but still exists in absolute time.
 *
 * `coverage` describes the stretches that make up that mapping. An instant
 * that falls in a gap between stretches has no local time at all — callers
 * must treat that as "nothing to show" (placeholder, no seek/play), never
 * clamp it to the nearest edge, since a silent clamp reproduces the frozen
 * tile this type exists to avoid.
 */
export interface ReplaySegmentCoverage {
  startsAtMs: number; // absolute start of the stretch
  endsAtMs: number; // absolute end of the stretch
  localStartSec: number; // where this stretch begins on the stitched timeline
}

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
  // Replay: os trechos de gravação desta câmera, para o painel traduzir o
  // instante absoluto do evento em tempo local dela. Ausente no ao vivo, onde
  // não existe timeline arquivada para mapear.
  coverage?: ReplaySegmentCoverage[];
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
  latencyMode: LatencyMode;
}

export interface ReplayCameraPlayback {
  cameraId: string;
  name: string;
  slug: string;
  priority: number;
  // e.g. '/packages/<packageId>/replay/master.m3u8' (relative to API base).
  // Null when this camera has no archived, replayable broadcast yet.
  replayPath: string | null;
  // Maps this camera's stitched (local) VOD timeline onto the event's
  // absolute wall-clock timeline — see replay-timeline.ts. Empty when the
  // camera has no replay.
  coverage: ReplaySegmentCoverage[];
}

// The event's absolute replay timeline — the domain every camera's coverage
// is expressed against. Null (at the call site) when no camera has any
// replay at all.
export interface ReplayEventTimeline {
  startsAtMs: number;
  endsAtMs: number;
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
  // União das coberturas de todas as câmeras — a timeline do evento e o
  // domínio do scrubber. Null quando nenhuma câmera tem replay arquivado.
  timeline: ReplayEventTimeline | null;
}
