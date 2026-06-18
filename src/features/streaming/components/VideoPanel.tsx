'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { toast } from 'sonner';
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

interface QualityLevel {
  index: number;
  height: number;
}

export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(false);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQuality, setShowQuality] = useState(false);
  const src = `${config.apiUrl}${camera.manifestPath}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(false);
    setLevels([]);
    setCurrentLevel(-1);

    // Prefer hls.js when MSE is available (Chrome, Firefox, desktop Safari 14.1+).
    // Only fall back to native HLS on iOS Safari where MSE is not supported.
    if (!Hls.isSupported()) {
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
      setLevels(
        hls.levels
          .map((l, i) => ({ index: i, height: l.height }))
          .sort((a, b) => b.height - a.height),
      );
      void video.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) {
        setError(true);
        toast.error(`Sinal perdido: ${camera.name}`, {
          id: `stream-error-${camera.cameraId}`,
          description: 'A câmera perdeu a conexão com o servidor.',
        });
      }
    });
    hlsRef.current = hls;

    return () => {
      hls.destroy();
      hlsRef.current = null;
      setLevels([]);
    };
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const selectLevel = (level: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level;
    setCurrentLevel(level);
    setShowQuality(false);
  };

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

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

      {levels.length > 0 && (
        <div className={styles.qualityWrapper}>
          {showQuality && (
            <div className={styles.qualityMenu}>
              <button
                className={currentLevel === -1 ? styles.qualityItemActive : styles.qualityItem}
                onClick={(e) => { e.stopPropagation(); selectLevel(-1); }}
              >
                Auto
              </button>
              {levels.map(({ index, height }) => (
                <button
                  key={index}
                  className={index === currentLevel ? styles.qualityItemActive : styles.qualityItem}
                  onClick={(e) => { e.stopPropagation(); selectLevel(index); }}
                >
                  {height}p
                </button>
              ))}
            </div>
          )}
          <button
            className={styles.qualityBtn}
            onClick={(e) => { e.stopPropagation(); setShowQuality((s) => !s); }}
          >
            {qualityLabel}
          </button>
        </div>
      )}

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
