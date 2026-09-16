'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReplayCameraPlayback, ReplayEventTimeline, ReplayStagePlayback, LiveCamera } from '../types/live.types';
import { ReplayBadge } from './transport/ReplayBadge';
import { formatTime } from './transport/live-scrubber';
import { localToAbsolute } from '../utils/replay-timeline';
import { useTrackPlaybackProgress, usePlaybackProgressQuery } from '@/features/playback-progress';
import { useAuth } from '@/features/account/hooks/use-auth';
import { usePlayerShell } from '../hooks/use-player-shell';
import type { PlayerStageLike } from '../hooks/use-player-stages';
import { Player, Transport } from './player';
import styles from './Player.module.scss';

interface ReplayPlayerProps {
  cameras: ReplayCameraPlayback[];
  stages?: ReplayStagePlayback[];
  primaryCameraId?: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none/VOD).
  librasCameraId?: string | null;
  title: string;
  eventId: string;
  // The event's absolute replay timeline (domain every camera's coverage maps
  // onto). Null when no camera has any replay — orchestration resolves this
  // from the API; we only render the empty state for it.
  timeline: ReplayEventTimeline | null;
  // Gates the pause-ad takeover — off must skip PauseAdTakeover entirely so
  // /ads/serve is never called, not just hide the result.
  adsEnabled?: boolean;
}

// CameraGrid/VideoPanel consume LiveCamera (manifestPath), not
// ReplayCameraPlayback (replayPath) — same shape, different field name for
// the two playback kinds. Map once here rather than renaming the field
// throughout the shared grid components.
function toLiveCamera(c: ReplayCameraPlayback): LiveCamera {
  return {
    cameraId: c.cameraId,
    name: c.name,
    slug: c.slug,
    priority: c.priority,
    manifestPath: c.replayPath,
    // Sem repassar aqui, a cobertura morre no mapeamento e todo painel
    // volta a tratar o instante absoluto como se fosse tempo local dele.
    coverage: c.coverage,
    llPath: null, // LL-HLS is a live-only mode; replay always plays the standard ABR ladder
    live: c.available,
    thumbnailUrl: c.thumbnailUrl,
  };
}

const firstPlayable = (list: LiveCamera[]) => list.find((c) => c.manifestPath !== null)?.cameraId;

// Replay = the shared player shell + the absolute event timeline, resume from
// saved progress and ending on pause. No chat, no viewer count.
//
// paused/seekCommand are applied to every active camera's <video> (see
// VideoPanel), so switching the main camera mid-playback doesn't leave a
// background tile still running or arbitrarily far out of sync — but each
// camera is still its own independent VOD timeline underneath (no frame-
// accurate cross-camera sync), a real, harder problem deliberately left for
// later.
export function ReplayPlayer({ cameras: rawCameras, stages: rawStages, primaryCameraId = null, librasCameraId = null, title, eventId, timeline, adsEnabled = true }: ReplayPlayerProps) {
  const t = useTranslations('player');

  const cameras = useMemo(() => rawCameras.map(toLiveCamera), [rawCameras]);
  const stages = useMemo<PlayerStageLike<LiveCamera>[] | undefined>(
    () => rawStages?.map((s) => ({ ...s, cameras: s.cameras.map(toLiveCamera) })),
    [rawStages],
  );

  const shell = usePlayerShell({
    cameras,
    stages,
    primaryCameraId,
    librasCameraId,
    // Starts paused: a VOD stream autoplaying with sound the moment the page
    // loads (no direct user gesture on this element) is exactly what browser
    // autoplay policies block anyway — same big-play-button pattern as any
    // VOD player.
    initialPaused: true,
    pickInitialCamera: firstPlayable,
  });

  // The absolute instant (ms, event timeline) playback is currently at — NOT
  // a camera's local media time. Each camera's <video> only knows its own
  // local seconds; positionMs is what lets cameras that joined the event at
  // different times still agree on "now" (see replay-timeline.ts).
  const [positionMs, setPositionMs] = useState(0);
  // seekCommand.time is the absolute instant (ms) — same domain as
  // positionMs, NOT a camera-local offset. The token still exists so
  // re-seeking the same instant twice in a row (e.g. resume) still applies.
  const [seekCommand, setSeekCommand] = useState<{ time: number; token: number } | null>(null);

  const { isLoggedIn } = useAuth();
  const { report } = useTrackPlaybackProgress({ eventId, enabled: isLoggedIn });
  // Deslogado não tem onde guardar posição, então nem busca.
  const { data: progress } = usePlaybackProgressQuery({ enabled: isLoggedIn });

  // Assim que a timeline chega, a posição parte do início do evento — só uma
  // vez, pra não pisar num seek que já tenha rolado (ex.: resume abaixo).
  const timelineSeeded = useRef(false);
  useEffect(() => {
    if (!timeline || timelineSeeded.current) return;
    timelineSeeded.current = true;
    setPositionMs(timeline.startsAtMs);
  }, [timeline]);

  // Retoma UMA vez por montagem. Sem a trava, uma revalidação da query no meio
  // da reprodução mandaria o espectador de volta ao ponto salvo — que a essa
  // altura já ficou para trás. Progresso é gravado em segundos relativos ao
  // início da timeline (linhas já existem nesse formato — ver report abaixo).
  const resumeApplied = useRef(false);
  useEffect(() => {
    if (resumeApplied.current || !progress || !timeline) return;
    const saved = progress.find((p) => p.eventId === eventId);
    resumeApplied.current = true;
    // resumeSeconds já vem 0 quando o evento foi concluído ou quando a posição
    // é pequena demais — a regra é do servidor, não recalcular aqui.
    if (!saved || saved.resumeSeconds <= 0) return;
    const resumeAbsoluteMs = timeline.startsAtMs + saved.resumeSeconds * 1000;
    setSeekCommand({ time: resumeAbsoluteMs, token: Date.now() });
    setPositionMs(resumeAbsoluteMs);
  }, [progress, eventId, timeline]);

  // CameraGrid only reports progress for the PRIMARY panel, and it reports in
  // that camera's own local seconds — its coverage is what converts that back
  // to the absolute instant everything else (positionMs, seekCommand) is in.
  const primaryCoverage = rawCameras.find((c) => c.cameraId === shell.effectiveMainCameraId)?.coverage ?? [];

  // `absoluteMs` is the event-timeline instant (see positionMs comment above),
  // not a camera-local offset — the transport bar's domain is the timeline.
  const handleSeek = (absoluteMs: number) => {
    setPositionMs(absoluteMs);
    setSeekCommand({ time: absoluteMs, token: Date.now() });
  };

  // ponytail: `!timeline` derruba o replay de VOD junto. O backend devolve
  // timeline null para VOD (asset único, sem costura de pacotes), então um VOD
  // com vídeo pronto cai aqui e anuncia "indisponível" — regressão conhecida,
  // adiada de propósito. Conserto: dar ao VOD uma timeline derivada da duração
  // do asset, mantendo um contrato só, em vez de abrir exceção neste guard.
  if (!cameras.some((c) => c.manifestPath !== null) || !timeline) {
    return (
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>{t('replayNotAvailable')}</p>
      </div>
    );
  }

  return (
    <Player.Root shell={shell} mode="replay" eventId={eventId} title={title} adsEnabled={adsEnabled}>
      <Player.Header badge="replay" />

      <Player.Stage
        // Sem isto o painel julgaria a cobertura pelo último seek, e uma
        // câmera que entra em cobertura enquanto o vídeo avança nunca
        // voltaria a tocar.
        positionMs={positionMs}
        seekCommand={seekCommand}
        onProgress={(localSeconds) => {
          const absoluteMs = localToAbsolute(primaryCoverage, localSeconds);
          // Outside the primary camera's coverage (a gap between its stitched
          // stretches) — nothing maps there. Keep the last known position
          // rather than write a wrong one.
          if (absoluteMs === null) return;
          setPositionMs(absoluteMs);
          report((absoluteMs - timeline.startsAtMs) / 1000, (timeline.endsAtMs - timeline.startsAtMs) / 1000);
        }}
        onEnded={() => shell.setPaused(true)}
      />

      <Player.Transport>
        <Transport.Play />
        <Transport.Badge><ReplayBadge /></Transport.Badge>
        {/* Labels show elapsed-since-timeline-start (0:00 at the beginning),
            not the underlying wall-clock ms — viewers read a stopwatch, not a date. */}
        <Transport.Scrubber
          min={timeline.startsAtMs}
          max={timeline.endsAtMs}
          value={positionMs}
          onSeek={handleSeek}
          leadingLabel={formatTime((positionMs - timeline.startsAtMs) / 1000)}
          trailingLabel={formatTime((timeline.endsAtMs - timeline.startsAtMs) / 1000)}
        />
        <Transport.Volume />
        <Transport.AudioCamera />
        <Transport.Quality />
        <Transport.Pip />
        <Transport.Fullscreen />
      </Player.Transport>

      <Player.Overlay />
    </Player.Root>
  );
}
