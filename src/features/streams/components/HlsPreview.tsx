'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X } from 'lucide-react';
import { config } from '@/config';
import styles from './HlsPreview.module.scss';

interface Props {
  packageId: string;
  onClose: () => void;
}

export function HlsPreview({ packageId, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const src = `${config.apiUrl}/origin/${packageId}/master.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari plays HLS natively; everyone else needs hls.js (MSE).
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const onErr = () =>
        setError('Falha ao carregar o preview (origin pode ainda não ter segmentos).');
      video.addEventListener('error', onErr);
      return () => video.removeEventListener('error', onErr);
    }
    if (!Hls.isSupported()) {
      setError('Navegador não suporta HLS.');
      return;
    }

    const hls = new Hls({ lowLatencyMode: true });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) setError('Falha ao carregar o preview (origin pode ainda não ter segmentos).');
    });
    return () => hls.destroy();
  }, [src]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} title="Fechar"><X size={16} /></button>
        {error ? (
          <p className={styles.error}>{error}</p>
        ) : (
          <video ref={videoRef} className={styles.video} controls autoPlay muted playsInline />
        )}
      </div>
    </div>
  );
}
