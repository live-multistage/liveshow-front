'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { config } from '@/config';
import type { LiveCamera } from '../types/live.types';
import styles from './LiveStreamPlayer.module.scss';

interface Props {
  cameras: LiveCamera[];
  initialCameraId: string;
}

export function LiveStreamPlayer({ cameras, initialCameraId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeId, setActiveId] = useState(initialCameraId);
  const [error, setError] = useState<string | null>(null);

  const active = cameras.find((c) => c.cameraId === activeId) ?? cameras[0];
  const src = active ? `${config.apiUrl}${active.manifestPath}` : '';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);

    // Safari plays HLS natively; everyone else needs hls.js (MSE).
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const seekLive = () => {
        const s = video.seekable;
        if (s.length) video.currentTime = s.end(s.length - 1);
      };
      const onErr = () => setError('Falha ao carregar o stream.');
      video.addEventListener('loadedmetadata', seekLive);
      video.addEventListener('error', onErr);
      return () => {
        video.removeEventListener('loadedmetadata', seekLive);
        video.removeEventListener('error', onErr);
      };
    }
    if (!Hls.isSupported()) {
      setError('Navegador não suporta HLS.');
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 6,
      backBufferLength: 10,
      maxLiveSyncPlaybackRate: 1.5,
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      void video.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) setError('Falha ao carregar o stream.');
    });
    return () => hls.destroy();
  }, [src]);

  return (
    <div className={styles.player}>
      <div className={styles.videoWrap}>
        <span className={styles.liveBadge}>● AO VIVO</span>
        {error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <video ref={videoRef} className={styles.video} controls autoPlay muted playsInline />
        )}
      </div>

      {cameras.length > 1 && (
        <div className={styles.cameraBar}>
          {cameras.map((c) => (
            <button
              key={c.cameraId}
              className={`${styles.camBtn} ${c.cameraId === active?.cameraId ? styles.camActive : ''}`}
              onClick={() => setActiveId(c.cameraId)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
