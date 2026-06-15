'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import { config } from '@/config';
import type { LiveCamera } from '../types/live.types';
import styles from './VideoPanel.module.scss';

interface VideoPanelProps {
  camera: LiveCamera;
  isActive?: boolean;
  onSelect?: () => void;
  isFocused?: boolean;
  showLabel?: boolean;
}

// One live camera tile: plays the camera's HLS (live-edge) with the player chrome.
// Muted by default so a grid of tiles doesn't stack audio; click the speaker to
// hear one.
export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(false);
  const src = `${config.apiUrl}${camera.manifestPath}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(false);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const seekLive = () => {
        const s = video.seekable;
        if (s.length) video.currentTime = s.end(s.length - 1);
      };
      const onErr = () => setError(true);
      video.addEventListener('loadedmetadata', seekLive);
      video.addEventListener('error', onErr);
      return () => {
        video.removeEventListener('loadedmetadata', seekLive);
        video.removeEventListener('error', onErr);
      };
    }
    if (!Hls.isSupported()) {
      setError(true);
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
      if (data.fatal) setError(true);
    });
    return () => hls.destroy();
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const panelClass = [
    styles.panel,
    isFocused ? styles.panelFocused : '',
    isActive ? styles.panelActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={panelClass} onClick={onSelect}>
      <video ref={videoRef} className={styles.video} autoPlay muted playsInline />

      {error && <div className={styles.panelError}>Sem sinal</div>}

      <div className={styles.topBar}>
        {showLabel && (
          <div className={styles.topLeft}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              LIVE
            </span>
            <span className={styles.cameraLabel}>{camera.name}</span>
          </div>
        )}
        <button
          className={styles.muteBtn}
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>

      {onSelect && (
        <div className={styles.hoverExpand}>
          <div className={styles.hoverExpandInner}>
            <Maximize2 size={18} />
          </div>
        </div>
      )}
    </div>
  );
}
