'use client';

import { Logo } from '@live-show/design-system';
import styles from './CameraOfflinePoster.module.scss';

interface Props {
  thumbnailUrl?: string | null;
}

// Shown in place of the <video> for a camera that isn't currently live
// (`live`/`available` false on the playback response). Keeps the tile in its
// grid position instead of the camera disappearing — a thumbnail poster when
// the backend has one, else the showon.io logo, both letterboxed (never
// cropped) on a dark tile.
export function CameraOfflinePoster({ thumbnailUrl }: Props) {
  return (
    <div className={styles.root} aria-hidden="true">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN thumbnail host, not a next/image domain
        <img src={thumbnailUrl} alt="" className={styles.thumb} />
      ) : (
        <Logo size={44} showWordmark={false} color="#ff2e9e" className={styles.logo} />
      )}
      <span className={styles.label}>SEM SINAL</span>
    </div>
  );
}
