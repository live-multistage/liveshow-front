// One selectable audio track of a camera (same source: program audio,
// commentary in another language, ambience). Track 0 is the program audio.
export interface AudioTrackInfo {
  index: number;
  // ISO 639 code as carried by the source (e.g. 'por', 'eng'); 'und' when unknown.
  language: string;
  // Source-provided title; null → UIs show the language name instead.
  label: string | null;
  default: boolean;
}

// hls.js audio track NAME the backend gives a camera's track in the stage /
// replay master: track 0 keeps the bare cameraId, the others `<cameraId>:<index>`.
export function hlsAudioTrackName(cameraId: string, index: number): string {
  return index === 0 ? cameraId : `${cameraId}:${index}`;
}

// Track to play for a viewer who prefers `language`: the matching track, else
// the default one, else the first.
export function pickAudioTrackIndex(
  tracks: readonly AudioTrackInfo[] | undefined,
  language: string | null,
): number {
  if (!tracks || tracks.length === 0) return 0;
  const preferred = language ? tracks.find((t) => t.language === language) : undefined;
  return (preferred ?? tracks.find((t) => t.default) ?? tracks[0]).index;
}
