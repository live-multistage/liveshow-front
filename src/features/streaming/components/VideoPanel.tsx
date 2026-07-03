'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { toast } from 'sonner';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import { config } from '@/config';
import type { LiveCamera } from '../types/live.types';
import styles from './VideoPanel.module.scss';

export interface QualityLevel {
  index: number;
  height: number;
}

interface VideoPanelProps {
  camera: LiveCamera;
  isActive?: boolean;
  onSelect?: () => void;
  isFocused?: boolean;
  showLabel?: boolean;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  // Real aspect ratio (videoWidth/videoHeight), reported once known and again
  // on any resolution change. CameraGrid uses this to row-justify the grid —
  // sizing here is entirely up to the wrapper it's rendered in.
  onAspectRatioReady?: (cameraId: string, ratio: number) => void;
  // Controlled from LivePlayer's toolbar — one mute switch for every tile,
  // not a per-panel local toggle (there was no way to reach that from the
  // toolbar where AO VIVO/fullscreen live, so it was effectively hidden).
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  // 'contain' (default) never crops — used for full-bleed playback (Solo,
  // Main, Grid tiles). 'cover' fills a fixed small box even if it crops —
  // used for utility thumbnails (PIP, rail) where showing the whole frame
  // matters less than a tidy uniform tile.
  fit?: 'contain' | 'cover';
  // Small thumbnails (PIP, rail) don't get their own mute toggle — audio is
  // one global choice (LivePlayer's cog menu), not per-tile at that size.
  showMuteButton?: boolean;
}

export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
  selectedLevel,
  onLevelsReady,
  onAspectRatioReady,
  muted,
  onMutedChange,
  fit = 'contain',
  showMuteButton = true,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  // manifestPath is null while the camera is broadcasting but not yet
  // transcoding (WAITING_VIEWERS/QUEUED/STARTING on the backend) — this
  // viewer joining is what triggers the backend to start it. The parent's
  // live-playback query keeps polling every 5s, so this becomes non-null on
  // its own once the backend promotes the job to RUNNING.
  const connecting = camera.manifestPath === null;
  const src = connecting ? null : `${config.apiUrl}${camera.manifestPath}`;

  // Real dimensions from the video element itself — works whether hls.js or
  // native HLS attached the source, and 'resize' also catches ABR quality
  // switches that change resolution mid-stream.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onAspectRatioReady) return;
    const report = () => {
      if (video.videoWidth && video.videoHeight) {
        onAspectRatioReady(camera.cameraId, video.videoWidth / video.videoHeight);
      }
    };
    video.addEventListener('loadedmetadata', report);
    video.addEventListener('resize', report);
    return () => {
      video.removeEventListener('loadedmetadata', report);
      video.removeEventListener('resize', report);
    };
  }, [camera.cameraId, onAspectRatioReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(false);

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
      const sorted = hls.levels
        .map((l, i) => ({ index: i, height: l.height }))
        .sort((a, b) => b.height - a.height);
      onLevelsReady?.(sorted);
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
    };
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (hlsRef.current && selectedLevel !== undefined) {
      hlsRef.current.currentLevel = selectedLevel;
    }
  }, [selectedLevel]);

  const panelClass = [
    styles.panel,
    isFocused ? styles.panelFocused : '',
    isActive ? styles.panelActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={panelClass} onClick={onSelect}>
      <video
        ref={videoRef}
        className={styles.video}
        style={{ objectFit: fit }}
        autoPlay
        muted
        playsInline
      />

      {connecting && <div className={styles.panelError}>Conectando…</div>}
      {!connecting && error && <div className={styles.panelError}>Sem sinal</div>}

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
        {showMuteButton && (
          <button
            className={styles.muteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onMutedChange(!muted);
            }}
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        )}
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
