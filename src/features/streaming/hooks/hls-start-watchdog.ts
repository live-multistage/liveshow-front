import Hls from 'hls.js';

type Range = [start: number, end: number];

const CHECK_MS = 1000;
// Audio and video segments of a healthy start land within a moment of each
// other, so tracks that stay apart this long are not going to meet by themselves.
const STUCK_CHECKS = 5;
const MAX_SEEKS = 3;

function rangesOf(buffer: SourceBuffer): Range[] {
  try {
    const { buffered } = buffer;
    return Array.from({ length: buffered.length }, (_, i): Range => [buffered.start(i), buffered.end(i)]);
  } catch {
    return []; // Removed from its MediaSource: hls.js is rebuilding the buffers.
  }
}

const newestRange = (ranges: Range[]): Range => ranges.reduce((a, b) => (b[1] > a[1] ? b : a));

// Where to seek a panel whose audio and video both have data but no shared
// `video.buffered` range at the playhead. Measured with 40 s and 92 s offsets:
// - a real overlap: its start;
// - audio EARLIER than video: back to the audio, the only place both can exist
//   (hls.js keeps both tracks growing at the same rate, so the gap never closes);
// - audio LATER than video: null. The audio is past the video's live edge, where
//   a seek gets clamped, and the overlap appears by itself once the video gets there.
export function resolveStartSeek(video: Range[], audio: Range[]): number | null {
  if (video.length === 0 || audio.length === 0) return null;
  // The NEWEST overlap: after a probe of the edge (see watchStuckStart) the
  // buffers still hold the old playable stretch, which is the worst fallback.
  let newestShared: number | null = null;
  for (const [vStart, vEnd] of video) {
    for (const [aStart, aEnd] of audio) {
      if (aStart < vEnd && aEnd > vStart) newestShared = Math.max(newestShared ?? -Infinity, vStart, aStart);
    }
  }
  if (newestShared !== null) return newestShared;
  const newestAudio = newestRange(audio);
  return newestAudio[1] <= newestRange(video)[0] ? newestAudio[0] : null;
}

const heldBehindLive = new WeakSet<Hls>();

// A panel whose media only plays far behind the edge. Followers can't share its
// clock: chasing it, against their own catch-up to the edge, loops on seeks and
// redownloads (measured: 2842 segments in 130 s).
export function isHeldBehindLive(hls: Hls | null): boolean {
  return !!hls && heldBehindLive.has(hls);
}

// Keeps a seek clear of the end of what is buffered on BOTH tracks.
const HELD_MARGIN_SEC = 1;
// Playing this close to the live sync point after a seek means the tracks meet
// at the edge again, so the panel is no longer held.
const BACK_AT_LIVE_SEC = 6;

// The furthest position a live panel can be moved to and keep playing: hls.js's
// live sync point, or for a held panel the end of the stretch where both
// tracks have media. Infinity when hls.js doesn't know yet.
export function reachableLivePosition(video: HTMLVideoElement, hls: Hls | null): number {
  const sync = hls?.liveSyncPosition;
  const live = typeof sync === 'number' && Number.isFinite(sync) ? sync : Infinity;
  if (!isHeldBehindLive(hls)) return live;
  const { buffered } = video;
  const playableEnd = buffered.length ? buffered.end(buffered.length - 1) - HELD_MARGIN_SEC : video.currentTime;
  return Math.min(live, Math.max(video.currentTime, playableEnd));
}

export interface StartWatchdogOptions {
  cameraId: string;
  // A held panel can only play far behind the edge: hls.js's catch-up must be
  // off while it is, and back on once the tracks meet at the edge again.
  onHeldChange?: (held: boolean) => void;
  // A held panel was sent to the edge. Only a new hls instance can tell whether
  // the tracks meet there now: this one has already mapped the audio playlist
  // onto the old, shifted timestamps (measured: a seek never got out of it).
  onEdgeRequested?: () => void;
}

// hls.js only moves to the start position once `video.buffered` has data, and
// that is the INTERSECTION of the tracks: audio and video that don't overlap
// leave the panel at currentTime 0 with no error, forever. A seek gets past
// that gate. The misalignment itself comes from the media, so the log carries
// each track's ranges for whoever has to chase it upstream.
//
// Once a panel is held, every seek of it re-arms the watchdog: one that gets
// stuck is sent back to the newest stretch that plays, and one to the edge asks
// for a new hls instance (see onEdgeRequested).
export function watchStuckStart(hls: Hls, video: HTMLVideoElement, { cameraId, onHeldChange, onEdgeRequested }: StartWatchdogOptions): () => void {
  let buffers: Record<string, SourceBuffer> = {};
  let stuckChecks = 0;
  let seeks = 0;
  let waitLogged = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let ownTarget: number | null = null;

  const onBufferCreated = (_event: unknown, data: { tracks: Record<string, { buffer?: SourceBuffer }> }) => {
    buffers = {};
    for (const [type, track] of Object.entries(data.tracks)) {
      if (track.buffer) buffers[type] = track.buffer;
    }
  };
  hls.on(Hls.Events.BUFFER_CREATED, onBufferCreated);

  const setHeld = (held: boolean) => {
    if (held === isHeldBehindLive(hls)) return;
    if (held) heldBehindLive.add(hls);
    else heldBehindLive.delete(hls);
    onHeldChange?.(held);
  };

  const disarm = () => {
    if (interval !== null) clearInterval(interval);
    interval = null;
  };

  const backAtLive = () => {
    const sync = hls.liveSyncPosition;
    return typeof sync === 'number' && sync - video.currentTime <= BACK_AT_LIVE_SEC;
  };

  const check = () => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      disarm();
      if (isHeldBehindLive(hls) && backAtLive()) {
        console.warn(`[hls-start-watchdog] camera=${cameraId} tracks meet at the edge again, hold lifted`);
        setHeld(false);
      }
      return;
    }
    if (!buffers.video || !buffers.audio) return;
    const videoRanges = rangesOf(buffers.video);
    const audioRanges = rangesOf(buffers.audio);
    if (videoRanges.length === 0 || audioRanges.length === 0) {
      stuckChecks = 0; // Nothing downloaded yet: a slow start, not a stuck one.
      return;
    }
    stuckChecks += 1;
    if (stuckChecks < STUCK_CHECKS) return;

    const target = resolveStartSeek(videoRanges, audioRanges);
    if (target === null && waitLogged) return;
    waitLogged = target === null;
    console.warn(
      `[hls-start-watchdog] camera=${cameraId} currentTime=${video.currentTime} readyState=${video.readyState} video=${JSON.stringify(videoRanges)} audio=${JSON.stringify(audioRanges)} ${target === null ? 'waiting for overlap' : `seek=${target} attempt=${seeks + 1}/${MAX_SEEKS}`}`,
    );
    if (target === null) return;

    stuckChecks = 0;
    seeks += 1;
    // Sitting behind the edge is the only way to play this media; hls.js's
    // catch-up would yank the panel straight back to where it can't start.
    if (target < videoRanges[0][0]) setHeld(true);
    ownTarget = target;
    video.currentTime = target;
    if (seeks >= MAX_SEEKS) disarm();
  };

  const arm = () => {
    stuckChecks = 0;
    seeks = 0;
    waitLogged = false;
    if (interval === null) interval = setInterval(check, CHECK_MS);
  };

  const onSeeking = () => {
    const own = ownTarget !== null && Math.abs(video.currentTime - ownTarget) < 0.01;
    ownTarget = null;
    if (own || !isHeldBehindLive(hls)) return;
    if (backAtLive() && onEdgeRequested) onEdgeRequested();
    else arm();
  };
  video.addEventListener('seeking', onSeeking);
  arm();

  return () => {
    disarm();
    video.removeEventListener('seeking', onSeeking);
  };
}
