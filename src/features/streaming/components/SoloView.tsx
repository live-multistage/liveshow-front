'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import styles from './SoloView.module.scss';

interface Props {
  camera: LiveCamera;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
}

// One camera, fills the whole player area. Used for viewMode 'solo', and
// forced whenever there's only one active camera regardless of the
// selected viewMode (CameraGrid handles that fallback).
export function SoloView({ camera, muted, onMutedChange, selectedLevel, onLevelsReady }: Props) {
  return (
    <div className={styles.solo}>
      <VideoPanel
        camera={camera}
        isFocused
        showLabel
        muted={muted}
        onMutedChange={onMutedChange}
        selectedLevel={selectedLevel}
        onLevelsReady={onLevelsReady}
      />
    </div>
  );
}
