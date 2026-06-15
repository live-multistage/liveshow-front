'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  title: string;
  eventId: string;
}

// Viewer live player: the multi-camera grid + chrome, wired to real HLS streams.
export function LivePlayer({ cameras, title, eventId }: LivePlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div ref={containerRef} className={styles.player}>
      <div className={styles.main}>
        <div className={styles.gridArea}>
          <CameraGrid
            cameras={cameras}
            title={title}
            subtitle={`${cameras.length} ${cameras.length === 1 ? 'câmera' : 'câmeras'} ao vivo`}
            onBack={() => router.push(`/events/${eventId}`)}
          />
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.controls}>
          <div className={styles.timeArea}>
            <div className={styles.liveBadge}>
              <span className={styles.liveIndicator} />
              AO VIVO
            </div>
          </div>

          <div className={styles.rightControls}>
            <button onClick={toggleFullscreen} className={styles.skipBtn}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
