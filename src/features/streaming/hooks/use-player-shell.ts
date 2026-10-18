'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { pickActiveStream } from '@live-show/api-contracts';
import type { LiveCamera } from '../types/live.types';
import type { ViewMode } from '../components/camera-layout';
import { useFullscreen } from './use-fullscreen';
import { usePictureInPicture } from './use-picture-in-picture';
import { usePlayerAudio } from './use-player-audio';
import type { PlayerAudioState } from './use-player-audio';
import { useQualityLevels } from './use-quality-levels';
import { useCameraSelection } from './use-camera-selection';
import { usePlayerStages } from './use-player-stages';
import type { PlayerStageLike } from './use-player-stages';
import { usePlayerHotkeys, VOLUME_STEP, clampVolume } from './use-player-hotkeys';

// A transmission as the shell needs it — live streams carry `live`, replay
// streams don't (they carry their own timeline, which the replay layer reads).
export interface PlayerStreamLike<C extends { cameraId: string; priority: number }> {
  id: string;
  title: string;
  position: number;
  live?: boolean;
  stages: PlayerStageLike<C>[];
  cameras: C[];
  primaryCameraId: string | null;
  librasCameraId: string | null;
}

export interface UsePlayerShellOptions {
  cameras: LiveCamera[];
  stages?: PlayerStageLike<LiveCamera>[];
  primaryCameraId?: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none).
  librasCameraId?: string | null;
  // Granted transmissions (≥1). When present, stages/cameras/primary/libras
  // come from the active one and the flattened props above are ignored.
  streams?: PlayerStreamLike<LiveCamera>[];
  defaultStreamId?: string | null;
  // Replay mounts paused (VOD big-play-button pattern); live starts playing.
  initialPaused?: boolean;
  // False for a channel: no archive behind the origin window, so the space
  // key has nothing to toggle.
  playbackEnabled?: boolean;
  // Which camera a freshly entered stage starts on. Default: the first one;
  // replay picks the first with media.
  pickInitialCamera?: (cameras: LiveCamera[]) => string | undefined;
  initialAudio?: PlayerAudioState;
  onAudioChange?: (audio: PlayerAudioState) => void;
  // Mode hooks into camera/stage transitions (live uses them to end or reset
  // its DVR rewind). All optional.
  onMainCameraChange?: (cameraId: string) => void;
  onMainDeselected?: () => void;
  onStageChange?: () => void;
}

// Everything the live and replay players share below the chrome: container
// + fullscreen/PiP, playback/pause-ad flags, view mode, camera drawer, stage
// model, camera selection (with the Libras rule), audio, quality, hotkeys.
// Modes layer their own state on top and hand the result to Player.Root.
export function usePlayerShell({
  cameras,
  stages: rawStages,
  primaryCameraId,
  librasCameraId = null,
  streams,
  defaultStreamId,
  initialPaused = false,
  playbackEnabled = true,
  pickInitialCamera = (list) => list[0]?.cameraId,
  initialAudio,
  onAudioChange,
  onMainCameraChange,
  onMainDeselected,
  onStageChange,
}: UsePlayerShellOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const { togglePictureInPicture } = usePictureInPicture(containerRef);

  const [paused, setPaused] = useState(initialPaused);
  const togglePlay = () => setPaused((p) => !p);
  // Drives the video-shrinks-into-a-card takeover: fed by PauseAdTakeover's
  // onVisibleChange, which fires false on resume/unmount so this can never
  // get stuck shrunk without an ad actually on screen.
  const [pauseAdVisible, setPauseAdVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  // Cameras and chapters share the right edge: opening one closes the other.
  // Live never shows the chapters pill, so chaptersOpen simply stays false there.
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const toggleCameraStrip = () => {
    setCameraStripOpen((o) => !o);
    setChaptersOpen(false);
  };
  const toggleChapters = () => {
    setChaptersOpen((o) => !o);
    setCameraStripOpen(false);
  };

  const orderedStreams = useMemo(
    () => [...(streams ?? [])].sort((a, b) => a.position - b.position),
    [streams],
  );
  // Seeded once: a later poll moving `defaultStreamId` (another stream went
  // live) must not pull the viewer off the transmission they are watching.
  const [chosenStreamId, setActiveStreamId] = useState<string | null>(
    () => pickActiveStream(orderedStreams, null, defaultStreamId)?.id ?? null,
  );
  const activeStream = pickActiveStream(orderedStreams, chosenStreamId, defaultStreamId);
  const tierCameras = activeStream ? activeStream.cameras : cameras;
  const tierStages = activeStream ? activeStream.stages : rawStages;
  const tierPrimary = activeStream ? activeStream.primaryCameraId : primaryCameraId;
  const tierLibras = activeStream ? activeStream.librasCameraId : librasCameraId;

  const { stages, activeStage, activeStageId, setActiveStageId } = usePlayerStages(
    tierCameras,
    tierStages,
    tierPrimary,
    activeStream?.id ?? null,
  );
  const stageCameras = activeStage?.cameras ?? [];

  // NBR 15290: the Libras window is only relevant when it belongs to the stage
  // currently on screen. When present it is force-activated and can't be removed.
  const librasInStage =
    tierLibras && stageCameras.some((c) => c.cameraId === tierLibras) ? tierLibras : null;

  const {
    activeCameraIds,
    setActiveCameraIds,
    setMainCameraId,
    effectiveMainCameraId,
    toggleCamera,
  } = useCameraSelection({ librasCameraId: librasInStage, onMainDeselected });

  const handleMainCameraChange = (cameraId: string) => {
    setMainCameraId(cameraId);
    onMainCameraChange?.(cameraId);
  };

  // Entering a stage (including the first render) starts on its initial
  // camera, always keeping the Libras window active alongside it.
  const stageCameraKey = stageCameras.map((c) => c.cameraId).sort().join(',');
  useEffect(() => {
    const first = pickInitialCamera(stageCameras);
    const initial = first ? [first] : [];
    if (librasInStage && !initial.includes(librasInStage)) initial.push(librasInStage);
    setActiveCameraIds(initial);
    onStageChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCameraKey]);

  // Audio follows the MAIN camera unless the viewer explicitly picked an audio
  // source. Falling back to cameras[0] instead used to leave the previous
  // default camera's audio playing after switching the main view.
  const audio = usePlayerAudio({
    cameras: stageCameras,
    fallbackCameraId: effectiveMainCameraId ?? stageCameras[0]?.cameraId ?? null,
    initialMuted: initialAudio?.muted,
    initialVolume: initialAudio?.volume,
    onChange: onAudioChange,
  });
  const { setGlobalMuted, setVolume } = audio;

  const quality = useQualityLevels();

  const effectiveViewMode: ViewMode = activeCameraIds.length <= 1 ? 'solo' : viewMode;
  const mainCameraName = stageCameras.find((c) => c.cameraId === effectiveMainCameraId)?.name;
  const metaLine = [activeStage?.name, mainCameraName, quality.qualityLabel].filter(Boolean).join(' · ');

  usePlayerHotkeys({
    onToggleFullscreen: toggleFullscreen,
    onToggleCameraPanel: toggleCameraStrip,
    onToggleMute: () => setGlobalMuted((m) => !m),
    onTogglePlay: playbackEnabled ? togglePlay : () => {},
    onVolumeUp: () => { setVolume((v) => clampVolume(v + VOLUME_STEP)); setGlobalMuted(false); },
    onVolumeDown: () => setVolume((v) => clampVolume(v - VOLUME_STEP)),
  });

  return {
    streams: orderedStreams,
    activeStreamId: activeStream?.id ?? null,
    setActiveStreamId,
    containerRef,
    isFullscreen,
    toggleFullscreen,
    togglePictureInPicture,
    paused,
    setPaused,
    togglePlay,
    pauseAdVisible,
    setPauseAdVisible,
    viewMode,
    setViewMode,
    effectiveViewMode,
    cameraStripOpen,
    setCameraStripOpen,
    toggleCameraStrip,
    chaptersOpen,
    setChaptersOpen,
    toggleChapters,
    stages,
    activeStage,
    activeStageId,
    setActiveStageId,
    stageCameras,
    librasInStage,
    activeCameraIds,
    effectiveMainCameraId,
    toggleCamera,
    handleMainCameraChange,
    audio,
    quality,
    metaLine,
  };
}

export type PlayerShell = ReturnType<typeof usePlayerShell>;
