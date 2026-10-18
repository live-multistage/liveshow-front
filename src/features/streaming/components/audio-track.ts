import { hlsAudioTrackName } from '@live-show/api-contracts';

export interface HlsAudioTrackLike {
  id: number;
  name: string;
}

// Index of the hls.js audio track for `cameraId`'s source track `trackIndex`
// (NAME `<cameraId>` or `<cameraId>:<index>`, see hlsAudioTrackName), or -1.
// A language track the master doesn't list falls back to the camera's program
// track, the way hls.js falls back to the group default.
export function audioTrackIndexForCamera(
  tracks: HlsAudioTrackLike[],
  cameraId: string | null | undefined,
  trackIndex = 0,
): number {
  if (!cameraId) return -1;
  const wanted = tracks.findIndex((t) => t.name === hlsAudioTrackName(cameraId, trackIndex));
  return wanted >= 0 ? wanted : tracks.findIndex((t) => t.name === cameraId);
}
