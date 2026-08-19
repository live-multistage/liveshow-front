export interface HlsAudioTrackLike {
  id: number;
  name: string;
}

// Index of the audio track whose NAME matches the requested cameraId, or -1.
export function audioTrackIndexForCamera(
  tracks: HlsAudioTrackLike[],
  cameraId: string | null | undefined,
): number {
  if (!cameraId) return -1;
  return tracks.findIndex((t) => t.name === cameraId);
}
