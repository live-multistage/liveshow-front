'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReplayCameraPlayback, ReplayChapter, ReplayEventTimeline, ReplayStagePlayback, ReplayPlaybackStream, LiveCamera } from '../types/live.types';
import { ReplayBadge } from './transport/ReplayBadge';
import { localToAbsolute } from '../utils/replay-timeline';
import { useTrackPlaybackProgress, usePlaybackProgressQuery } from '@/features/playback-progress';
import { useAuth } from '@/features/account/hooks/use-auth';
import { usePlayerShell, type PlayerStreamLike } from '../hooks/use-player-shell';
import { MAIN_STAGE_ID, type PlayerStageLike } from '../hooks/use-player-stages';
import { pickActiveStream, visibleChapters } from '@live-show/api-contracts';
import { formatClock } from '../utils/chapter-track';
import { ChaptersDrawer } from './chapters/ChaptersDrawer';
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
  // Chapters marked on the replay (GET /events/:id/replay-chapters). Undefined
  // or empty renders the player exactly as without the feature.
  chapters?: ReplayChapter[];
  // Granted transmissions, each with its own replay window. Absent = legacy
  // flattened props above (the default stream's view).
  streams?: ReplayPlaybackStream[];
  defaultStreamId?: string | null;
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

const clampToWindow = (ms: number, w: ReplayEventTimeline) => Math.min(Math.max(ms, w.startsAtMs), w.endsAtMs);

// Replay = the shared player shell + the absolute event timeline, resume from
// saved progress and ending on pause. No chat, no viewer count.
//
// paused/seekCommand are applied to every active camera's <video> (see
// VideoPanel), so switching the main camera mid-playback doesn't leave a
// background tile still running or arbitrarily far out of sync — but each
// camera is still its own independent VOD timeline underneath (no frame-
// accurate cross-camera sync), a real, harder problem deliberately left for
// later.
export function ReplayPlayer({ cameras: rawCameras, stages: rawStages, primaryCameraId = null, librasCameraId = null, title, eventId, timeline: eventTimeline, adsEnabled = true, chapters, streams: rawStreams, defaultStreamId }: ReplayPlayerProps) {
  const t = useTranslations('player');

  const cameras = useMemo(() => rawCameras.map(toLiveCamera), [rawCameras]);
  const stages = useMemo<PlayerStageLike<LiveCamera>[] | undefined>(
    () => rawStages?.map((s) => ({ ...s, cameras: s.cameras.map(toLiveCamera) })),
    [rawStages],
  );
  const streams = useMemo<PlayerStreamLike<LiveCamera>[] | undefined>(
    () =>
      rawStreams?.map((s) => ({
        ...s,
        cameras: s.cameras.map(toLiveCamera),
        stages: s.stages.map((st) => ({ ...st, cameras: st.cameras.map(toLiveCamera) })),
      })),
    [rawStreams],
  );
  // When the default transmission has no replay, open on the first one that
  // has: otherwise the player shows its empty state and the selector with it
  // is unreachable.
  const sortedRawStreams = useMemo(
    () => [...(rawStreams ?? [])].sort((a, b) => a.position - b.position),
    [rawStreams],
  );
  const firstWithReplay = sortedRawStreams.find((s) => s.timeline !== null) ?? null;
  const replayDefaultStreamId = pickActiveStream(sortedRawStreams, null, defaultStreamId)?.timeline
    ? defaultStreamId
    : (firstWithReplay?.id ?? defaultStreamId);

  const shell = usePlayerShell({
    cameras,
    stages,
    primaryCameraId,
    librasCameraId,
    streams,
    defaultStreamId: replayDefaultStreamId,
    // Starts paused: a VOD stream autoplaying with sound the moment the page
    // loads (no direct user gesture on this element) is exactly what browser
    // autoplay policies block anyway — same big-play-button pattern as any
    // VOD player.
    initialPaused: true,
    pickInitialCamera: firstPlayable,
  });

  // Each transmission has its own replay window. A stream with no replay at
  // all keeps the default stream's window (or the first one with a replay)
  // so the selector stays reachable.
  const activeRawStream = rawStreams?.find((s) => s.id === shell.activeStreamId) ?? null;
  const timeline = activeRawStream?.timeline ?? eventTimeline ?? firstWithReplay?.timeline ?? null;
  const activeRawCameras = activeRawStream?.cameras ?? rawCameras;
  // Saved progress is per event, in seconds from the DEFAULT stream's window
  // (the flattened `timeline`), whatever transmission is on screen — so a
  // stream switch never shifts what a resume means.
  const progressWindow = eventTimeline ?? timeline;

  // Chapters follow the stage on screen: event-wide ones plus that stage's.
  // The synthetic main stage (event without stages) sees only event-wide ones.
  const chapterStageId = shell.activeStageId === MAIN_STAGE_ID ? null : shell.activeStageId;
  const shownChapters = useMemo(
    () => (timeline && chapters ? visibleChapters(chapters, chapterStageId, timeline) : []),
    [chapters, chapterStageId, timeline],
  );
  // Pill and drawer only exist once chapters loaded and this stage has any.
  const chaptersAvailable = shownChapters.length > 0;
  const { setChaptersOpen } = shell;
  // A stage switch can leave nothing to list; close the drawer with it or the
  // chrome would stay inset beside a drawer that no longer renders.
  useEffect(() => {
    if (!chaptersAvailable) setChaptersOpen(false);
  }, [chaptersAvailable, setChaptersOpen]);
  const stageNames = useMemo(
    () => (shell.stages.length > 1 ? Object.fromEntries(shell.stages.map((s) => [s.stageId, s.name])) : null),
    [shell.stages],
  );

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
    if (resumeApplied.current || !progress || !progressWindow || !timeline) return;
    const saved = progress.find((p) => p.eventId === eventId);
    resumeApplied.current = true;
    // resumeSeconds já vem 0 quando o evento foi concluído ou quando a posição
    // é pequena demais — a regra é do servidor, não recalcular aqui.
    if (!saved || saved.resumeSeconds <= 0) return;
    // Relative to the default window, landed inside the one on screen.
    const resumeAbsoluteMs = clampToWindow(progressWindow.startsAtMs + saved.resumeSeconds * 1000, timeline);
    setSeekCommand({ time: resumeAbsoluteMs, token: Date.now() });
    setPositionMs(resumeAbsoluteMs);
  }, [progress, eventId, progressWindow, timeline]);

  // CameraGrid only reports progress for the PRIMARY panel, and it reports in
  // that camera's own local seconds — its coverage is what converts that back
  // to the absolute instant everything else (positionMs, seekCommand) is in.
  const primaryCoverage = activeRawCameras.find((c) => c.cameraId === shell.effectiveMainCameraId)?.coverage ?? [];

  // `absoluteMs` is the event-timeline instant (see positionMs comment above),
  // not a camera-local offset — the transport bar's domain is the timeline.
  const handleSeek = (absoluteMs: number) => {
    setPositionMs(absoluteMs);
    setSeekCommand({ time: absoluteMs, token: Date.now() });
  };

  // Each camera is its own VOD timeline, so the one taking over sits wherever
  // it was left — or never loaded at all. Without a seek a switch jumped back
  // in the event or froze on a black frame. Re-seek to the instant on screen.
  const positionRef = useRef(positionMs);
  useEffect(() => {
    positionRef.current = positionMs;
  }, [positionMs]);
  const mainCameraId = shell.effectiveMainCameraId;
  const previousMainCameraId = useRef(mainCameraId);
  useEffect(() => {
    if (previousMainCameraId.current === mainCameraId) return;
    previousMainCameraId.current = mainCameraId;
    setSeekCommand({ time: positionRef.current, token: Date.now() });
  }, [mainCameraId]);

  // A transmission switch lands on the same instant when the new stream
  // covers it, else on the nearest edge of its own window.
  const previousStreamId = useRef(shell.activeStreamId);
  useEffect(() => {
    if (previousStreamId.current === shell.activeStreamId) return;
    previousStreamId.current = shell.activeStreamId;
    if (!timeline) return;
    const target = clampToWindow(positionRef.current, timeline);
    setPositionMs(target);
    setSeekCommand({ time: target, token: Date.now() });
  }, [shell.activeStreamId, timeline]);

  // ponytail: `!timeline` derruba o replay de VOD junto. O backend devolve
  // timeline null para VOD (asset único, sem costura de pacotes), então um VOD
  // com vídeo pronto cai aqui e anuncia "indisponível" — regressão conhecida,
  // adiada de propósito. Conserto: dar ao VOD uma timeline derivada da duração
  // do asset, mantendo um contrato só, em vez de abrir exceção neste guard.
  // Across every transmission, so switching to a stream without replay never
  // strands the viewer outside the player (and its selector).
  const anyPlayable = (rawStreams?.length ? rawStreams.flatMap((s) => s.cameras) : rawCameras).some(
    (c) => c.replayPath !== null,
  );
  if (!anyPlayable || !timeline) {
    return (
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>{t('replayNotAvailable')}</p>
      </div>
    );
  }

  return (
    <Player.Root shell={shell} mode="replay" eventId={eventId} title={title} adsEnabled={adsEnabled}>
      <Player.Header badge="replay" chapters={chaptersAvailable ? { count: shownChapters.length } : undefined} />

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
          const win = progressWindow ?? timeline;
          const duration = (win.endsAtMs - win.startsAtMs) / 1000;
          // ponytail: a stream recorded outside the default window clamps to its edges.
          report(Math.min(Math.max((absoluteMs - win.startsAtMs) / 1000, 0), duration), duration);
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
          leadingLabel={formatClock(positionMs - timeline.startsAtMs, timeline.endsAtMs - timeline.startsAtMs)}
          trailingLabel={formatClock(timeline.endsAtMs - timeline.startsAtMs, timeline.endsAtMs - timeline.startsAtMs)}
          chapters={shownChapters}
        />
        <Transport.Volume />
        <Transport.AudioCamera />
        <Transport.Quality />
        <Transport.Pip />
        <Transport.Fullscreen />
      </Player.Transport>

      {chaptersAvailable && (
        <Player.Aside>
          <ChaptersDrawer
            open={shell.chaptersOpen}
            chapters={shownChapters}
            positionMs={positionMs}
            timeline={timeline}
            stageNames={stageNames}
            onSeek={handleSeek}
            onClose={() => setChaptersOpen(false)}
          />
        </Player.Aside>
      )}

      <Player.Overlay />
    </Player.Root>
  );
}
