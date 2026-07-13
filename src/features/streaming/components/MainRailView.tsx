'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import { PipOverlay } from './PipOverlay';
import { CameraRail } from './CameraRail';
import styles from './MainRailView.module.scss';

interface Props {
  mainCamera: LiveCamera;
  otherCameras: LiveCamera[];
  onSelectMain: (cameraId: string) => void;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  // Audio context for the non-main tiles (PIP / rail) so audio can follow the
  // selected audio camera even when it isn't the maximized one.
  audioCameraId: string | null;
  globalMuted: boolean;
  volume?: number;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  mode?: 'live' | 'replay';
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

// F1 TV-style layout: big main video + either a PIP overlay (exactly 1
// other active camera) or a sidebar rail (2 or more others). See
// docs/superpowers/specs/2026-07-02-live-viewer-camera-modes-design.md for
// why the split happens at exactly 2-total vs 3-plus-total cameras.
export function MainRailView({
  mainCamera,
  otherCameras,
  onSelectMain,
  muted,
  onMutedChange,
  audioCameraId,
  globalMuted,
  volume = 1,
  selectedLevel,
  onLevelsReady,
  mode = 'live',
  paused,
  seekCommand,
  onProgress,
  onEnded,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.mainArea}>
        <VideoPanel
          camera={mainCamera}
          isFocused
          showLabel={false}
          showMuteButton={false}
          muted={muted}
          onMutedChange={onMutedChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
          mode={mode}
          paused={paused}
          seekCommand={seekCommand}
          isTimeSource
          onProgress={onProgress}
          onEnded={onEnded}
        />
        {otherCameras.length === 1 && (
          <PipOverlay
            camera={otherCameras[0]}
            onSelect={() => onSelectMain(otherCameras[0].cameraId)}
            audioCameraId={audioCameraId}
            globalMuted={globalMuted}
            volume={volume}
            mode={mode}
            paused={paused}
            seekCommand={seekCommand}
          />
        )}
      </div>
      {otherCameras.length >= 2 && (
        <CameraRail
          cameras={otherCameras}
          onSelect={onSelectMain}
          audioCameraId={audioCameraId}
          globalMuted={globalMuted}
          volume={volume}
          mode={mode}
          paused={paused}
          seekCommand={seekCommand}
        />
      )}
    </div>
  );
}
