import type { AudioTrackInfo } from './audio-tracks';
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
  // True when this camera has an active transcode/HLS output right now.
  // Every ENABLED camera of the stream is always present in `cameras` (stable
  // grid — no layout shift on ingest loss); `live: false` cameras carry
  // manifestPath/llPath: null and the player should show `thumbnailUrl`
  // instead of attempting HLS.
  live: boolean;
  // Poster shown when `live` is false (or while connecting). Null falls back
  // to the showon.io logo.
  thumbnailUrl?: string | null;
  // Present only when the camera carries 2+ audio tracks; absent = one default
  // track and no audio selector.
  audioTracks?: AudioTrackInfo[];
}

export interface LiveStage {
  stageId: string;
  name: string;
  slug: string;
  position: number;
  cameras: LiveCamera[];
}

// One transmission of the event, as this viewer may see it (granted only).
export interface LivePlaybackStream {
  id: string;
  title: string;
  position: number;
  // At least one of its cameras is transcoding; false = shown as offline.
  live: boolean;
  stages: LiveStage[];
  cameras: LiveCamera[];
  primaryCameraId: string | null;
  // NBR 15290 — one Libras window per transmission.
  librasCameraId: string | null;
}

// A transmission this viewer is not granted but can buy (amendment
// 2026-10-18). Never playable: no cameras, stages, paths or token entry.
export interface LockedStreamOffer {
  id: string;
  title: string;
  position: number;
  // Live: at least one of its cameras is transcoding. Always false on replay.
  live: boolean;
  // The cheapest on-sale ticket product of the event that grants it.
  offer: { ticketProductId: string; name: string; priceCents: number; currency: string };
}

export interface LivePlaybackResponse {
  eventId: string;
  // Any granted transmission is live.
  live: boolean;
  // Granted transmissions, ordered by position. Absent on servers older than
  // multi-transmission — fall back to the flattened fields below.
  streams?: LivePlaybackStream[];
  // First live stream by position, else the first. Null when nothing is visible.
  defaultStreamId?: string | null;
  // Transmissions for sale to this viewer, shown locked in the selector.
  // Absent on older servers; empty when fully granted.
  lockedStreams?: LockedStreamOffer[];
  /** @deprecated flattened view of `defaultStreamId` — read `streams`; removed one release after web ships. */
  stages?: LiveStage[];
  /** @deprecated see `stages`. */
  cameras: LiveCamera[];
  /** @deprecated see `stages`. */
  primaryCameraId: string | null;
  /** @deprecated see `stages`. */
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
  // True when this camera has a replayable package (== replayPath !== null).
  // Every enabled camera of the stream is always present in `cameras` (stable
  // grid); the player should show `thumbnailUrl` when false.
  available: boolean;
  // Poster shown when `available` is false. Null falls back to the showon.io logo.
  thumbnailUrl?: string | null;
  // Present only when the camera carries 2+ audio tracks; absent = one default
  // track and no audio selector.
  audioTracks?: AudioTrackInfo[];
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

export interface ReplayPlaybackStream {
  id: string;
  title: string;
  position: number;
  stages: ReplayStagePlayback[];
  cameras: ReplayCameraPlayback[];
  primaryCameraId: string | null;
  librasCameraId: string | null;
  // This transmission's own replay window (transmissions recorded at different
  // times keep different windows). Null when none of its cameras has a replay.
  timeline: ReplayEventTimeline | null;
}

export interface ReplayPlaybackResponse {
  eventId: string;
  available: boolean;
  // Granted transmissions, ordered by position. Absent on older servers.
  streams?: ReplayPlaybackStream[];
  // First live stream by position, else the first. Null when nothing is visible.
  defaultStreamId?: string | null;
  // Transmissions for sale to this viewer, shown locked in the selector.
  // Absent on older servers; empty when fully granted.
  lockedStreams?: LockedStreamOffer[];
  /** @deprecated flattened view of defaultStreamId. */
  stages: ReplayStagePlayback[];
  /** @deprecated flattened view of defaultStreamId. */
  cameras: ReplayCameraPlayback[];
  /** @deprecated flattened view of defaultStreamId. */
  primaryCameraId: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none/VOD).
  /** @deprecated flattened view of defaultStreamId. */
  librasCameraId: string | null;
  // União das coberturas de todas as câmeras — a timeline do evento e o
  // domínio do scrubber. Null quando nenhuma câmera tem replay arquivado.
  /** @deprecated flattened view of defaultStreamId. */
  timeline: ReplayEventTimeline | null;
}

// Replay chapters — instants are absolute epoch ms, the same domain as
// ReplayEventTimeline, so one list serves every camera and stage.
export interface ReplayChapterArtist {
  id: string;
  name: string;
  slug: string;
}

export interface ReplayChapter {
  id: string;
  // Null = applies to the whole event; otherwise only to that stage.
  stageId: string | null;
  startsAtMs: number;
  endsAtMs: number;
  title: string;
  description: string | null;
  artists: ReplayChapterArtist[];
}

export interface ReplayChaptersResponse {
  chapters: ReplayChapter[];
  // Null = replay unavailable (no timeline yet).
  window: ReplayEventTimeline | null;
}

export interface ReplaceReplayChaptersRequest {
  chapters: {
    stageId?: string | null;
    startsAtMs: number;
    endsAtMs: number;
    title: string;
    description?: string | null;
    artistIds?: string[];
  }[];
}

export type ReplayChapterSuggestionIssue = 'NO_END_TIME' | 'OUTSIDE_TIMELINE' | 'MULTI_STAGE' | 'OVERLAP';

export interface ReplayChapterSuggestion {
  sourceScheduleItemId: string;
  stageId: string | null;
  startsAtMs: number;
  endsAtMs: number | null;
  title: string;
  description: string | null;
  artistIds: string[];
  issues: ReplayChapterSuggestionIssue[];
}

export interface ReplayChapterSuggestionsResponse {
  suggestions: ReplayChapterSuggestion[];
}
