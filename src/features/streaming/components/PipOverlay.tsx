'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import styles from './PipOverlay.module.scss';

interface Props {
  camera: LiveCamera;
  onSelect: () => void;
  // Audio follows the selected audio camera, not the main camera — so the PIP
  // plays sound when it is the chosen audio source (and stays muted otherwise).
  audioCameraId: string | null;
  globalMuted: boolean;
  volume?: number;
  mode?: 'live' | 'replay';
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
}

// Small floating box over the bottom-right corner of the main video — used
// instead of CameraRail specifically when there are exactly 2 active
// cameras (main + 1 other). A 1-item vertical rail looked sparse; F1 TV's
// own player uses this exact PIP treatment for the 2-camera case (see
// design spec for the reference screenshot).
export function PipOverlay({ camera, onSelect, audioCameraId, globalMuted, volume, mode = 'live', paused, seekCommand }: Props) {
  const muted = globalMuted || camera.cameraId !== audioCameraId;
  return (
    <div className={styles.pip} onClick={onSelect}>
      <VideoPanel
        camera={camera}
        showLabel
        showMuteButton={false}
        fit="cover"
        muted={muted}
        volume={volume}
        onMutedChange={() => {}}
        mode={mode}
        paused={paused}
        seekCommand={seekCommand}
      />
    </div>
  );
}
