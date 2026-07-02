'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import styles from './CameraRail.module.scss';

interface Props {
  cameras: LiveCamera[]; // every active camera except the current main
  onSelect: (cameraId: string) => void;
}

// Vertical list of small fixed-size camera thumbnails — used instead of
// PipOverlay once there are 3+ active cameras (main + 2 or more others).
export function CameraRail({ cameras, onSelect }: Props) {
  return (
    <div className={styles.rail}>
      {cameras.map((camera) => (
        <div key={camera.cameraId} className={styles.tile} onClick={() => onSelect(camera.cameraId)}>
          <VideoPanel
            camera={camera}
            showLabel
            showMuteButton={false}
            fit="cover"
            muted
            onMutedChange={() => {}}
          />
        </div>
      ))}
    </div>
  );
}
