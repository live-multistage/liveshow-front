'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { config } from '@/config';
import styles from './HlsVideo.module.scss';

interface Props {
  packageId: string;
  className?: string;
  controls?: boolean;
}

// Core HLS playback — no chrome (no overlay/close button). Used inline by
// StreamPreviewPanel for real-time on-air preview, and wrapped by HlsPreview
// for the per-camera modal preview in FeedBody.
export function HlsVideo({ packageId, className, controls = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const src = `${config.apiUrl}/origin/${packageId}/master.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    // Safari plays HLS natively; everyone else needs hls.js (MSE).
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const onErr = () =>
        setError('Falha ao carregar o preview (origin pode ainda não ter segmentos).');
      // Jump to the live edge on load so we monitor "now", not the window start.
      const seekLive = () => {
        const s = video.seekable;
        if (s.length) video.currentTime = s.end(s.length - 1);
      };
      video.addEventListener('error', onErr);
      video.addEventListener('loadedmetadata', seekLive);
      return () => {
        video.removeEventListener('error', onErr);
        video.removeEventListener('loadedmetadata', seekLive);
      };
    }
    if (!Hls.isSupported()) {
      setError('Navegador não suporta HLS.');
      return;
    }

    // Live, low-latency: stay ~2 segments behind the edge, keep a short back
    // buffer, and let hls.js speed up slightly to catch the live edge if it drifts.
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
      if (data.fatal) setError('Falha ao carregar o preview (origin pode ainda não ter segmentos).');
    });
    return () => hls.destroy();
  }, [src]);

  if (error) return <p className={styles.error}>{error}</p>;
  return (
    <video
      ref={videoRef}
      className={`${styles.video} ${className ?? ''}`}
      controls={controls}
      autoPlay
      muted
      playsInline
    />
  );
}
