'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { toast } from 'sonner';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import { config } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';
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
  // Pin this panel to the smallest rendition, overriding selectedLevel. Used
  // for background/thumbnail panels (hidden, PIP, rail, strip previews) that
  // stay decoding for instant switching but don't need full quality — cuts
  // their CPU/bandwidth. Cleared (→ auto/selectedLevel) the moment the panel
  // becomes the main view, which upshifts over a segment or two, no reload.
  lowQuality?: boolean;
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
  // Applied via video.volume. Independent from `muted` — mute is a hard
  // on/off switch, volume only matters once unmuted. Optional: utility
  // thumbnails (PIP, rail, CameraStrip) never pass it and get the browser
  // default of 1, which is irrelevant since they're always muted anyway.
  volume?: number;
  // 'live' (default): unchanged existing behavior — auto-plays muted, seeks
  // to the live edge on Safari's native HLS path, custom mute-only overlay.
  // 'replay': VOD playback — no live-edge seek, every hls.js request
  // (manifest + segments) carries the viewer's bearer token (replay routes
  // are JWT-gated unlike live's public /origin/* serving), and play/pause/seek
  // are driven entirely by ReplayTransportBar via the props below — no native
  // <video controls>, matching the live player's own custom-chrome look.
  mode?: 'live' | 'replay';
  // Replay only. Controlled like `muted` above — every active camera's
  // <video> gets the same paused state so switching the main camera mid-
  // playback doesn't leave a background tile still running.
  paused?: boolean;
  // Replay only. A new object (even with the same `time`) re-applies the
  // seek — the token is what triggers the effect, not the time value alone,
  // so re-seeking to a position already reached still works.
  seekCommand?: { time: number; token: number } | null;
  // Replay only. True for exactly one active camera's panel (the current
  // main/focused one) — only that panel's native playback events drive
  // ReplayTransportBar's clock and end-of-video handling.
  isTimeSource?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

// Index of the smallest-height rendition in a parsed hls instance (-1 if none).
function lowestLevelIndex(hls: Hls): number {
  const levels = hls.levels;
  if (!levels || levels.length === 0) return -1;
  let min = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].height < levels[min].height) min = i;
  }
  return min;
}

export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
  selectedLevel,
  onLevelsReady,
  lowQuality = false,
  onAspectRatioReady,
  muted,
  onMutedChange,
  fit = 'contain',
  showMuteButton = true,
  volume = 1,
  mode = 'live',
  paused,
  seekCommand,
  isTimeSource = false,
  onProgress,
  onEnded,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // MANIFEST_PARSED's handler is created once per `src` (see the hls effect's
  // own deps below) and fires asynchronously — its closure would otherwise
  // see the `paused` value from whenever that effect last ran, not whatever
  // it is by the time the manifest actually finishes parsing.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Refs so MANIFEST_PARSED (fires async, once per src) applies the current
  // quality choice rather than whatever it was when the load effect ran.
  const lowQualityRef = useRef(lowQuality);
  lowQualityRef.current = lowQuality;
  const selectedLevelRef = useRef(selectedLevel);
  selectedLevelRef.current = selectedLevel;

  const applyLevel = (hls: Hls) => {
    if (!hls.levels || hls.levels.length === 0) return;
    hls.currentLevel = lowQualityRef.current
      ? lowestLevelIndex(hls)
      : (selectedLevelRef.current ?? -1);
  };
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
        const onErr = () => setError(true);
        video.addEventListener('error', onErr);
        // Live only: jump to the live edge once metadata loads. Replay is a
        // closed VOD timeline — starting at 0 (the browser default) is correct.
        if (mode === 'live') {
          const seekLive = () => {
            const s = video.seekable;
            if (s.length) video.currentTime = s.end(s.length - 1);
          };
          video.addEventListener('loadedmetadata', seekLive);
          return () => {
            video.removeEventListener('loadedmetadata', seekLive);
            video.removeEventListener('error', onErr);
          };
        }
        return () => video.removeEventListener('error', onErr);
      }
      setError(true);
      return;
    }

    const hls = new Hls({
      lowLatencyMode: mode === 'live',
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 6,
      backBufferLength: 10,
      maxLiveSyncPlaybackRate: 1.5,
      // Replay routes (manifest + segments) are JWT-gated, unlike live's
      // public /origin/* origin serving — attach the bearer token to every
      // request hls.js makes. No-op for live (mode default), so live's
      // network behavior is unchanged.
      ...(mode === 'replay' && {
        xhrSetup: (xhr: XMLHttpRequest) => {
          const token = tokenStore.get();
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        },
      }),
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const sorted = hls.levels
        .map((l, i) => ({ index: i, height: l.height }))
        .sort((a, b) => b.height - a.height);
      onLevelsReady?.(sorted);
      applyLevel(hls);
      // Live always autoplays; replay only if not currently paused (a fresh
      // camera thumbnail/tile shouldn't start itself just because its own
      // manifest happened to finish parsing after the shared paused state
      // was already set).
      if (mode !== 'replay' || !pausedRef.current) void video.play().catch(() => {});
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
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // When this panel becomes the focused/main view (live), snap it to the live
  // edge. Background panels stay alive but can drift a second or two behind
  // live, so promoting one would otherwise reveal it slightly out of sync with
  // real time / the other tiles. Only nudges FORWARD, and only on a real gap.
  useEffect(() => {
    if (mode !== 'live' || !isFocused) return;
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;
    const live = hls.liveSyncPosition;
    if (typeof live === 'number' && Number.isFinite(live) && live - video.currentTime > 1) {
      video.currentTime = live;
    }
  }, [isFocused, mode]);

  useEffect(() => {
    if (hlsRef.current) applyLevel(hlsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowQuality, selectedLevel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'replay' || paused === undefined) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [paused, mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seekCommand) return;
    video.currentTime = seekCommand.time;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekCommand?.token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onProgress) return;
    const report = () => onProgress(video.currentTime, video.duration || 0);
    video.addEventListener('timeupdate', report);
    video.addEventListener('durationchange', report);
    return () => {
      video.removeEventListener('timeupdate', report);
      video.removeEventListener('durationchange', report);
    };
  }, [isTimeSource, onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onEnded) return;
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [isTimeSource, onEnded]);

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
        data-focused={isFocused}
        autoPlay={mode !== 'replay'}
        muted={muted}
        playsInline
      />

      {connecting && (
        <div className={styles.panelError}>
          {mode === 'replay' ? 'Replay indisponível' : 'Conectando…'}
        </div>
      )}
      {!connecting && error && <div className={styles.panelError}>Sem sinal</div>}

      <div className={styles.topBar}>
        {showLabel && (
          <div className={styles.topLeft}>
            {mode === 'live' && (
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                LIVE
              </span>
            )}
            <span className={styles.cameraLabel}>{camera.name}</span>
          </div>
        )}
        {showMuteButton && mode === 'live' && (
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
