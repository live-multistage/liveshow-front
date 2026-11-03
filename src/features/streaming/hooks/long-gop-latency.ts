// The live sync distance for a camera whose GOP is long under a nominal
// TARGETDURATION (the back keeps it at 2 while a segment only closes on a
// keyframe). hls.js aims 3 target durations behind the edge, but the playlist
// moves in whole-GOP jumps, so with an 11 s GOP the buffer ran dry on each jump:
// 47% of the time frozen. 1.5 segments back keeps one segment of slack.
//
// Only when the TYPICAL segment is long. Measured on playlists from the back's
// own code: with occasional long segments (6% above 2.5 s, like the lab's
// Pepsi camera) hls.js barely froze (~1 s in 90 s), and a margin sized for the
// longest one only added 5-11 s of latency.
export function longGopLiveSync(durations: number[], targetDuration: number): number | null {
  if (durations.length === 0) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  if (median < 2 * targetDuration) return null;
  return 1.5 * sorted[sorted.length - 1];
}
