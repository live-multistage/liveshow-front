// Elapsed live-clock for the control room. The counter must reflect time since
// the broadcast actually went on air (a camera's transcode job startedAt), NOT
// since the page opened. Returns a dash when nothing is on air.
export function formatElapsed(startedAt: string | null | undefined, nowMs: number): string {
  if (!startedAt) return '—';
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return '—';
  // Clamp negative (clock skew: server startedAt slightly ahead of client now).
  const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
