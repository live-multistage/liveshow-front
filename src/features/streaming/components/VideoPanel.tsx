import { useState, useEffect, useRef } from 'react';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import type { Camera } from '@/features/events/types/show';
import styles from './VideoPanel.module.scss';

interface VideoPanelProps {
  camera: Camera;
  isActive?: boolean;
  onSelect?: () => void;
  isFocused?: boolean;
  showLabel?: boolean;
  isReplay?: boolean;
  replayTime?: number;
}

export function VideoPanel({
  camera,
  isActive = false,
  onSelect,
  isFocused = false,
  showLabel = true,
  isReplay = false,
  replayTime = 0,
}: VideoPanelProps) {
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(replayTime);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % 60);
      if (!isReplay) setTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isReplay]);

  useEffect(() => {
    setTime(replayTime);
  }, [replayTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const bars = Array.from({ length: 12 }, (_, i) => ({
    height: Math.sin(frame * 0.3 + i * 0.7) * 40 + 50,
    opacity: 0.7 + Math.sin(frame * 0.1 + i) * 0.3,
  }));

  const panelClass = [
    styles.panel,
    isFocused ? styles.panelFocused : '',
    isActive  ? styles.panelActive  : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={panelClass} onClick={onSelect}>
      <div
        className={styles.bg}
        style={{ background: `linear-gradient(135deg, ${camera.gradient})` }}
      />

      <div
        className={styles.noise}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className={styles.scanlines} />

      <div className={styles.waveform}>
        <div className={styles.waveformBars}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={styles.waveformBar}
              style={{
                height: `${bar.height * 0.4}px`,
                backgroundColor: camera.color,
                opacity: bar.opacity,
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.lightBeams}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={styles.beam}
            style={{
              left: `${20 + i * 30}%`,
              background: `linear-gradient(to bottom, ${camera.color}, transparent)`,
              transform: `rotate(${-10 + i * 10 + Math.sin(frame * 0.05 + i) * 5}deg)`,
            }}
          />
        ))}
      </div>

      <div className={styles.topBar}>
        {showLabel && (
          <div className={styles.topLeft}>
            {!isReplay ? (
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                LIVE
              </span>
            ) : (
              <span className={styles.replayBadge}>REPRISE</span>
            )}
            <span className={styles.cameraLabel}>{camera.name}</span>
          </div>
        )}
        <button
          className={styles.muteBtn}
          onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>

      <div className={styles.bottomBar}>
        <span className={styles.timeCode}>{formatTime(time)}</span>
        <span className={styles.angleLabel}>{camera.angle}</span>
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
