'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';
import type Hls from 'hls.js';
import { absoluteToLocal } from '../utils/replay-timeline';
import type { ReplaySegmentCoverage } from '../utils/replay-timeline';

// A playback position within this of the live edge still counts as "live".
// hls.js parks playback at `liveSyncPosition` (edge − liveSyncDurationCount ×
// target duration) and lets it drift by up to a segment either way while it
// catches up at maxLiveSyncPlaybackRate, so exact equality never happens. Three
// seconds sits above that natural jitter (one 2s segment) and well below any
// deliberate DVR scrub-back, so the badge neither flickers during normal
// playback nor claims "live" once the viewer has actually rewound.
export const LIVE_EDGE_TOLERANCE_SEC = 3;

// Safari's native HLS player has no liveSyncPosition to report, so the edge
// falls back to seekable.end — but native playback deliberately parks about
// three target durations behind the playlist end (HLS spec recommendation),
// i.e. routinely 6–18s. Judged by the hls.js tolerance every Safari viewer
// would read as "behind live" from the first frame. targetDuration isn't
// reachable without an hls instance, so the native branch gets a tolerance
// wide enough to cover that parking distance instead.
export const NATIVE_LIVE_EDGE_TOLERANCE_SEC = 20;

/**
 * Um live pausado por tempo suficiente cai para FORA da janela deslizante: o
 * `seekable.start` avança enquanto o `currentTime` fica parado. Retomar dali
 * pediria segmentos que o servidor já descartou, e o player trava sem erro.
 *
 * Só age quando a posição realmente saiu da janela — uma pausa curta continua
 * sendo um rewind de DVR legítimo, e arrastar o viewer de volta ao vivo nesse
 * caso seria roubar dele a posição que ele escolheu.
 */
function recoverIfOutsideWindow(video: HTMLVideoElement, hls?: Hls | null): void {
  const seekable = video.seekable;
  if (!seekable.length) return;

  const start = seekable.start(0);
  if (video.currentTime >= start) return;

  const sync = hls?.liveSyncPosition;
  const end = seekable.end(seekable.length - 1);
  video.currentTime = typeof sync === 'number' && Number.isFinite(sync) ? sync : end;
}

export function isAtLiveEdge(
  position: number,
  edge: number,
  tolerance: number = LIVE_EDGE_TOLERANCE_SEC,
): boolean {
  return edge - position <= tolerance;
}

// Where the primary live panel currently sits inside its DVR window.
export interface LiveWindow {
  // Start of the seekable (sliding) window.
  start: number;
  // hls.js's live sync target — the position "live" actually means, which is
  // a few segments BEHIND seekable.end, not the end itself.
  edge: number;
  // How close to `edge` still counts as live — depends on which player
  // produced `edge` (see NATIVE_LIVE_EDGE_TOLERANCE_SEC).
  tolerance: number;
}

// A commanded seek. The token is what re-applies it (see below); `cameraId` is
// the camera whose timeline `time` was read from — live media timelines are
// unrelated between cameras, so applying one camera's offset to another is
// always wrong. In replay, `time` is the event's ABSOLUTE instant in ms, not a
// per-camera offset — a camera that joined late or dropped out has its own
// coverage of that instant, and assuming one offset fits every camera is
// exactly the bug this type used to encode.
export interface LiveSeekCommand {
  time: number;
  token: number;
  cameraId?: string | null;
}

export interface UseTransportControlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  // Live instance, needed for liveSyncPosition. Null on Safari's native-HLS
  // path, where the seekable end is used as the live edge instead.
  hlsRef?: RefObject<Hls | null>;
  mode: 'live' | 'replay';
  // Shared paused state — every active camera's <video> gets the same value so
  // switching the main camera mid-playback doesn't leave a background tile
  // still running.
  //
  // Live pauses too: the stream keeps being produced, so resuming continues
  // from where the viewer stopped, i.e. behind the live edge. That is a DVR
  // rewind, and the transport bar's existing return-to-live is how the viewer
  // gets back. Undefined means "this panel doesn't manage playback" and the
  // effect stays out of the way entirely.
  paused?: boolean;
  // A new object (even with the same `time`) re-applies the seek — the token
  // is what triggers the effect, not the time value alone, so re-seeking to a
  // position already reached still works. Used by replay's scrubber and by
  // live's DVR scrubber / return-to-live. `cameraId` (live only) records which
  // camera's media timeline the offset came from — CameraGrid uses it to keep
  // the command off any other panel.
  seekCommand?: LiveSeekCommand | null;
  // Replay only. This panel's own stretches of archived coverage — absent for
  // live and for replay callers that haven't wired it up yet, in which case
  // `seekCommand.time` is applied as-is (unchanged behavior).
  coverage?: ReplaySegmentCoverage[];
  // Só para diagnóstico: sem isto um `[play-failed]` no console não diz QUAL
  // câmera falhou, que é a primeira coisa que se quer saber num player
  // multicâmera.
  cameraId?: string;
  // Replay: o instante ABSOLUTO em que a reprodução está agora.
  //
  // A cobertura tem de ser julgada contra ISTO, não contra o último seek: a
  // reprodução avança sozinha, sem emitir seek nenhum, então derivar do
  // seekCommand deixava o painel preso no veredito de um instante que já
  // passou — uma câmera que entrava em cobertura nunca voltava a tocar.
  positionMs?: number;
  // True for exactly one active camera's panel (the current main/focused one)
  // — only that panel's native playback events drive the transport bar's clock
  // and end-of-video handling.
  isTimeSource?: boolean;
  // `duration` is the VOD length in replay and the seekable END in live (where
  // video.duration is Infinity and therefore useless). `live` is present only
  // in live mode.
  onProgress?: (currentTime: number, duration: number, live?: LiveWindow) => void;
  onEnded?: () => void;
}

// Transport wiring for one panel: pause/resume, commanded seeks and the
// time-source progress/ended reporting. Replay drives play/pause/seek from
// ReplayTransportBar; live drives DVR seeks and the live-edge readout from
// TransportBar. Behavior characterized by VideoPanel.characterization.test.tsx.
export interface UseTransportControlsResult {
  // Replay + coverage only: the commanded absolute instant falls in a gap this
  // camera doesn't cover (hasn't joined yet, or dropped out and reconnected).
  // The panel must show a placeholder instead of a frozen frame — always
  // false for live and for replay panels without a `coverage` prop.
  outsideCoverage: boolean;
}

export function useTransportControls({
  videoRef,
  hlsRef,
  mode,
  paused,
  seekCommand,
  coverage,
  cameraId,
  positionMs,
  isTimeSource = false,
  onProgress,
  onEnded,
}: UseTransportControlsOptions): UseTransportControlsResult {
  // Recomputed every render straight from props — not state — so it's never a
  // render behind seekCommand/coverage.
  // A posição corrente manda; o seek comandado é só o ponto de partida antes
  // de o primeiro progresso chegar.
  const judgedAtMs = positionMs ?? seekCommand?.time;
  const outsideCoverage =
    mode === 'replay' &&
    !!coverage &&
    judgedAtMs !== undefined &&
    absoluteToLocal(coverage, judgedAtMs) === null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || paused === undefined) return;
    if (paused) {
      video.pause();
      return;
    }
    // Asking for a position this camera's media doesn't cover is exactly what
    // produces the frozen tile — skip play() rather than start it against
    // nothing.
    //
    // A recusa é logada porque o silêncio é indistinguível de "nem tentou": foi
    // exatamente isso que escondeu a causa quando `[play-failed]` não aparecia.
    if (outsideCoverage) {
      console.warn(
        `[play-skipped] camera=${cameraId ?? '-'} mode=${mode} reason=outside-coverage ` +
          `at=${judgedAtMs ?? '-'} stretches=${coverage?.length ?? 0}`,
      );
      return;
    }
    // Cada painel corrige a si mesmo: as câmeras ao vivo têm timelines de mídia
    // independentes, então a janela de uma não diz nada sobre a da outra.
    if (mode === 'live') recoverIfOutsideWindow(video, hlsRef?.current);

    // Um painel que ainda estava carregando quando a reprodução começou faz o
    // play() REJEITAR, e a rejeição era engolida sem ninguém tentar de novo —
    // aquela câmera ficava parada para sempre.
    //
    // É o caso comum, não a exceção: o CameraGrid monta um painel para TODA
    // câmera do palco desde o carregamento, então dar play com cinco câmeras
    // ainda baixando manifest deixa a principal tocando e as outras mudas.
    //
    // `canplay` é o momento em que o elemento finalmente tem dados. Chamar
    // play() em quem já toca é no-op, então repetir não custa nada, e o
    // listener sai junto com o estado de reprodução.
    let cancelled = false;
    let failures = 0;

    const attemptPlay = () => {
      if (cancelled) return;
      void video
        .play()
        .then(() => {
          // "Falhou e depois tocou" é uma história diferente de "nunca tocou".
          // Sem esta linha, o log só mostra a falha e não diz se o retry salvou.
          if (failures > 0 && !cancelled) {
            console.warn(
              `[play-recovered] camera=${cameraId ?? '-'} mode=${mode} afterAttempts=${failures}`,
            );
            failures = 0;
          }
        })
        .catch((err: unknown) => {
          // AbortError é play() interrompido por um pause() ou por um load novo
          // — rotina do próprio ciclo do player, não falha. Logar isso afogaria
          // o sinal que importa.
          if (err instanceof DOMException && err.name === 'AbortError') return;

          failures += 1;
          const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
          console.warn(
            `[play-failed] camera=${cameraId ?? '-'} mode=${mode} attempt=${failures} error=${detail}`,
          );
        });
    };

    // Quem pausou?
    //
    // Enquanto o estado diz "tocando", qualquer `pause` que chegue no elemento
    // veio de FORA do nosso código — política de autoplay ao desmutar, troca de
    // faixa de áudio que esvazia o buffer, erro de mídia. Sem isto, "a câmera
    // parou" é indistinguível de "nunca começou", e as duas causas ficam no
    // mesmo balde.
    const onUnexpectedPause = () => {
      if (cancelled) return;
      console.warn(
        `[paused-externally] camera=${cameraId ?? '-'} mode=${mode} ` +
          `readyState=${video.readyState} networkState=${video.networkState} muted=${video.muted}`,
      );
    };

    video.addEventListener('canplay', attemptPlay);
    video.addEventListener('pause', onUnexpectedPause);
    attemptPlay();

    return () => {
      cancelled = true;
      video.removeEventListener('canplay', attemptPlay);
      video.removeEventListener('pause', onUnexpectedPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mode, outsideCoverage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seekCommand) return;
    if (mode === 'replay' && coverage) {
      // Null means outside coverage — leave currentTime untouched rather than
      // clamp to an edge, which would recreate the frozen-tile bug this fixes.
      const localTime = absoluteToLocal(coverage, seekCommand.time);
      if (localTime === null) return;
      video.currentTime = localTime;
      return;
    }
    video.currentTime = seekCommand.time;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekCommand?.token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onProgress) return;
    const report = () => {
      if (mode !== 'live') {
        onProgress(video.currentTime, video.duration || 0);
        return;
      }
      // Live: video.duration is Infinity (hls.js declares the media source
      // endless and publishes the DVR window through setLiveSeekableRange), so
      // the scrubber's bounds come from `seekable`, not from duration.
      const seekable = video.seekable;
      if (!seekable.length) return;
      const end = seekable.end(seekable.length - 1);
      const sync = hlsRef?.current?.liveSyncPosition;
      const hasSync = typeof sync === 'number' && Number.isFinite(sync);
      onProgress(video.currentTime, end, {
        start: seekable.start(0),
        edge: hasSync ? sync : end,
        tolerance: hasSync ? LIVE_EDGE_TOLERANCE_SEC : NATIVE_LIVE_EDGE_TOLERANCE_SEC,
      });
    };
    video.addEventListener('timeupdate', report);
    video.addEventListener('durationchange', report);
    return () => {
      video.removeEventListener('timeupdate', report);
      video.removeEventListener('durationchange', report);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onProgress, mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onEnded) return;
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onEnded]);

  return { outsideCoverage };
}
