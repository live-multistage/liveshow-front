'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX,
  Maximize, Minimize, SkipBack, SkipForward, Radio, Film, Info, X,
} from 'lucide-react';
import type { Show } from '@/features/events/types/show';
import { CameraGrid } from './CameraGrid';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  show: Show;
}

export function LivePlayer({ show }: LivePlayerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'live' | 'replay'>('live');
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [replayTime, setReplayTime] = useState(0);
  const [duration] = useState(7200);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing && mode === 'live') {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (playing && mode === 'replay') {
      intervalRef.current = setInterval(() => setReplayTime((t) => Math.min(t + 1, duration)), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, mode, duration]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div ref={containerRef} className={styles.player}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button
            onClick={() => router.push(`/events/${show.id}`)}
            className={styles.backBtn}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className={styles.showTitle}>{show.title}</p>
            <p className={styles.showMeta}>{show.artist} · {show.venue}</p>
          </div>
        </div>

        <div className={styles.modeSwitcher}>
          <button
            onClick={() => { setMode('live'); setPlaying(true); }}
            className={`${styles.modeBtn} ${mode === 'live' ? styles.modeBtnLiveActive : ''}`}
          >
            <Radio size={14} />
            <span>Ao Vivo</span>
            {mode === 'live' && <span className={styles.livePulse} />}
          </button>
          {show.hasReplay && (
            <button
              onClick={() => { setMode('replay'); setReplayTime(0); setPlaying(true); }}
              className={`${styles.modeBtn} ${mode === 'replay' ? styles.modeBtnReplayActive : ''}`}
            >
              <Film size={14} />
              <span>Reprise</span>
            </button>
          )}
        </div>

        <div className={styles.topRight}>
          {show.isLive && mode === 'live' && (
            <div className={styles.viewerCount}>
              <span className={styles.viewerDot} />
              {show.viewers?.toLocaleString('pt-BR')} ao vivo
            </div>
          )}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`${styles.iconBtn} ${showInfo ? styles.iconBtnActive : ''}`}
          >
            <Info size={16} />
          </button>
          <button onClick={toggleFullscreen} className={styles.iconBtn}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.gridArea}>
          <CameraGrid cameras={show.cameras} isReplay={mode === 'replay'} replayTime={replayTime} />
        </div>

        {showInfo && (
          <div className={styles.infoPanel}>
            <div className={styles.infoPanelInner}>
              <div className={styles.infoPanelHeader}>
                <h3 className={styles.infoPanelTitle}>Info do Show</h3>
                <button onClick={() => setShowInfo(false)} className={styles.iconBtn}>
                  <X size={16} />
                </button>
              </div>

              <img src={show.image} alt={show.title} className={styles.infoPanelImage} />

              <p className={styles.infoPanelShowTitle}>{show.title}</p>
              <p className={styles.infoPanelArtist}>{show.artist}</p>
              <p className={styles.infoPanelDesc}>{show.description}</p>

              <div className={styles.infoPanelMeta}>
                {[
                  { label: 'Local', value: show.venue },
                  { label: 'Cidade', value: `${show.city}, ${show.country}` },
                  { label: 'Data', value: show.date },
                  { label: 'Horário', value: show.time },
                  { label: 'Duração', value: show.duration },
                  { label: 'Câmeras', value: `${show.cameras.length} ângulos` },
                ].map((item) => (
                  <div key={item.label} className={styles.infoPanelMetaRow}>
                    <span className={styles.infoPanelMetaLabel}>{item.label}</span>
                    <span className={styles.infoPanelMetaValue}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div className={styles.infoPanelDivider} />
              <p className={styles.infoPanelTagLabel}>TAGS</p>
              <div className={styles.tagList}>
                {show.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.controls}>
          <div className={styles.playGroup}>
            <button
              className={styles.skipBtn}
              onClick={() => setReplayTime(Math.max(0, replayTime - 30))}
              disabled={mode === 'live'}
            >
              <SkipBack size={16} />
            </button>
            <button onClick={() => setPlaying(!playing)} className={styles.playBtn}>
              {playing
                ? <Pause size={16} color="white" />
                : <Play size={16} color="white" fill="white" />
              }
            </button>
            <button
              className={styles.skipBtn}
              onClick={() => setReplayTime(Math.min(duration, replayTime + 30))}
              disabled={mode === 'live'}
            >
              <SkipForward size={16} />
            </button>
          </div>

          <div className={styles.timeArea}>
            {mode === 'live' ? (
              <>
                <span className={styles.timeCode}>{formatTime(elapsed)}</span>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFillLive} />
                </div>
                <div className={styles.liveBadge}>
                  <span className={styles.liveIndicator} />
                  AO VIVO
                </div>
              </>
            ) : (
              <>
                <span className={styles.timeCode}>{formatTime(replayTime)}</span>
                <div
                  className={`${styles.progressTrack} ${styles.progressTrackClickable}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    setReplayTime(Math.floor(ratio * duration));
                  }}
                >
                  <div
                    className={styles.progressFillReplay}
                    style={{ width: `${(replayTime / duration) * 100}%` }}
                  />
                </div>
                <span className={styles.timeCode}>{formatTime(duration)}</span>
              </>
            )}
          </div>

          <div className={styles.rightControls}>
            <button onClick={() => setMuted(!muted)} className={styles.skipBtn}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {mode === 'replay' && (
              <button onClick={() => setReplayTime(0)} className={styles.skipBtn} title="Reiniciar">
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
