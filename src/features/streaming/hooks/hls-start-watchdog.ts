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
  for (const [vStart, vEnd] of video) {
    const shared = audio.find(([aStart, aEnd]) => aStart < vEnd && aEnd > vStart);
    if (shared) return Math.max(vStart, shared[0]);
  }
  const newestAudio = newestRange(audio);
  return newestAudio[1] <= newestRange(video)[0] ? newestAudio[0] : null;
}

// hls.js only moves to the start position once `video.buffered` has data, and
// that is the INTERSECTION of the tracks: audio and video that don't overlap
// leave the panel at currentTime 0 with no error, forever. A seek gets past
// that gate. The misalignment itself comes from the media, so the log carries
// each track's ranges for whoever has to chase it upstream.
export function watchStuckStart(hls: Hls, video: HTMLVideoElement, cameraId: string): () => void {
  let buffers: Record<string, SourceBuffer> = {};
  let stuckChecks = 0;
  let seeks = 0;
  let waitLogged = false;

  const onBufferCreated = (_event: unknown, data: { tracks: Record<string, { buffer?: SourceBuffer }> }) => {
    buffers = {};
    for (const [type, track] of Object.entries(data.tracks)) {
      if (track.buffer) buffers[type] = track.buffer;
    }
  };
  hls.on(Hls.Events.BUFFER_CREATED, onBufferCreated);

  const stop = () => clearInterval(interval);

  const interval = setInterval(() => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      stop();
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
    if (target < videoRanges[0][0]) hls.config.liveMaxLatencyDurationCount = Infinity;
    video.currentTime = target;
    if (seeks >= MAX_SEEKS) stop();
  }, CHECK_MS);

  return stop;
}
