/** Um item de `GET /me/playback-progress`. */
export interface PlaybackProgressEntry {
  eventId: string;
  positionSeconds: number;
  durationSeconds: number;
  /**
   * Onde a reprodução deve COMEÇAR — decidido pelo servidor. É 0 quando o
   * evento já foi concluído ou quando a posição é pequena demais para valer.
   * Não recalcular aqui: a regra vive num lugar só, e uma segunda cópia
   * divergiria em silêncio.
   */
  resumeSeconds: number;
  completed: boolean;
  updatedAt: string;
}

/** Payload de `PUT /me/playback-progress`. */
export interface PlaybackProgressUpsert {
  eventId: string;
  positionSeconds: number;
  durationSeconds: number;
}
