'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import styles from './CameraRail.module.scss';

interface Props {
  cameras: LiveCamera[]; // every active camera except the current main
  onSelect: (cameraId: string) => void;
  // Audio follows the selected audio camera, not the main — a rail tile plays
  // sound when it is the chosen audio source (and stays muted otherwise).
  audioCameraId: string | null;
  globalMuted: boolean;
  volume?: number;
  mode?: 'live' | 'replay';
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
}

// Vertical list of small fixed-size camera thumbnails — used instead of
// PipOverlay once there are 3+ active cameras (main + 2 or more others).
export function CameraRail({ cameras, onSelect, audioCameraId, globalMuted, volume, mode = 'live', paused, seekCommand }: Props) {
  return (
    <div className={styles.rail}>
      {cameras.map((camera) => (
        <div key={camera.cameraId} className={styles.tile} onClick={() => onSelect(camera.cameraId)}>
          <VideoPanel
            camera={camera}
            showLabel
            showMuteButton={false}
            fit="cover"
            muted={globalMuted || camera.cameraId !== audioCameraId}
            volume={volume}
            onMutedChange={() => {}}
            mode={mode}
            paused={paused}
            seekCommand={seekCommand}
          />
        </div>
      ))}
    </div>
  );
}
