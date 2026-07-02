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
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
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
  selectedLevel,
  onLevelsReady,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.mainArea}>
        <VideoPanel
          camera={mainCamera}
          isFocused
          showLabel
          muted={muted}
          onMutedChange={onMutedChange}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
        />
        {otherCameras.length === 1 && (
          <PipOverlay camera={otherCameras[0]} onSelect={() => onSelectMain(otherCameras[0].cameraId)} />
        )}
      </div>
      {otherCameras.length >= 2 && <CameraRail cameras={otherCameras} onSelect={onSelectMain} />}
    </div>
  );
}
