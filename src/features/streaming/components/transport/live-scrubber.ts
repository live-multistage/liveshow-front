import type { DvrState, TransportScrubber } from '../TransportBar';

// Below this the seekable window is just the player's own buffer, not real
// DVR history — a scrubber over it would be a control with nowhere to go.
export const MIN_DVR_WINDOW_SEC = 30;

// How far behind the live edge the viewer currently is, e.g. "-1:23".
export function formatBehind(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `-${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Elapsed stopwatch label, e.g. "12:05".
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Live DVR scrubber over the manifest's seekable window. Null when there is
// nothing worth scrubbing: no window yet, a buffer-sized window, nobody to act
// on a seek, or a channel (showPlayback=false) with no archive behind it.
export function liveScrubber(
  dvr: DvrState | null | undefined,
  onSeek: ((time: number) => void) | undefined,
  showPlayback: boolean,
): TransportScrubber | null {
  if (!showPlayback || !dvr || !onSeek) return null;
  if (dvr.end - dvr.start < MIN_DVR_WINDOW_SEC) return null;
  return {
    min: dvr.start,
    max: dvr.end,
    value: dvr.position,
    onSeek,
    leadingLabel: formatBehind(dvr.edge - dvr.position),
  };
}
