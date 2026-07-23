'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import { track } from '@/lib/analytics/analytics-client';
import type { LiveCamera } from '../types/live.types';
import { useHlsPlayer } from '../hooks/use-hls-player';
import type { QualityLevel } from '../hooks/use-hls-player';
import { useReplayControls } from '../hooks/use-replay-controls';
import { useClockSync } from '../hooks/use-clock-sync';
import type { ClockRole, ClockSample } from '../hooks/use-clock-sync';
import type { MutableRefObject } from 'react';
import styles from './VideoPanel.module.scss';

// Re-exported so existing importers (CameraGrid, tests) keep their paths.
export { playBestEffort } from '../hooks/use-hls-player';
export type { QualityLevel } from '../hooks/use-hls-player';

interface VideoPanelProps {
  camera: LiveCamera;
  isActive?: boolean;
  onSelect?: () => void;
  isFocused?: boolean;
  showLabel?: boolean;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  // Camera whose audio track should play through this panel's hls instance
  // (live AND replay — both use hls.js; only Safari's native HLS path, which
  // has no hls instance, is a no-op). Only the primary/unmuted panel gets
  // this — see Task 12.
  selectedAudioCameraId?: string;
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
  // Fired when best-effort unmuted autoplay is blocked by the browser and this
  // panel falls back to muted — lets the parent sync its global mute UI.
  onAutoplayBlocked?: () => void;
  // Wall-clock camera sync (live): 'master' publishes its PROGRAM-DATE-TIME
  // position into clockRef; 'follower' corrects its playback against it so
  // every camera shows the same real-world instant. See use-clock-sync.
  clockRole?: ClockRole;
  clockRef?: MutableRefObject<ClockSample | null>;
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

export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
  selectedLevel,
  onLevelsReady,
  selectedAudioCameraId,
  lowQuality = false,
  onAspectRatioReady,
  muted,
  onMutedChange,
  onAutoplayBlocked,
  clockRole,
  clockRef,
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
  const t = useTranslations('player');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Full hls.js lifecycle (build/tuning, Safari branch, levels, audio tracks,
  // LL→STANDARD fallback, live-edge focus snap) lives in the hook; analytics
  // and toasts stay here as callbacks.
  const { connecting, error, hlsRef } = useHlsPlayer({
    videoRef,
    camera,
    mode,
    isFocused,
    paused,
    selectedLevel,
    lowQuality,
    selectedAudioCameraId,
    onLevelsReady,
    onAutoplayBlocked,
    onLlFallback: (reason, detail) => {
      track({
        eventType: 'll_fallback_to_standard',
        entityType: 'camera',
        entityId: camera.cameraId,
        properties: { reason, detail: detail ?? null, cameraName: camera.name },
      });
      console.warn(`[ll-fallback] camera=${camera.cameraId} reason=${reason} detail=${detail ?? '-'}`);
    },
    onFatalError: () => {
      toast.error(t('signalLostTitle', { name: camera.name }), {
        id: `stream-error-${camera.cameraId}`,
        description: t('signalLostDesc'),
      });
    },
  });

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
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // Replay transport wiring (paused/seek/progress/ended) — see the hook.
  useReplayControls({ videoRef, mode, paused, seekCommand, isTimeSource, onProgress, onEnded });

  // Wall-clock sync against the primary panel's PROGRAM-DATE-TIME.
  useClockSync({ videoRef, hlsRef, mode, role: clockRole, clockRef });

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
          {mode === 'replay' ? t('replayUnavailable') : t('connecting')}
        </div>
      )}
      {!connecting && error && <div className={styles.panelError}>{t('noSignal')}</div>}

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
