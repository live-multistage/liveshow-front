'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, X,
} from 'lucide-react';
import type { Show } from '@/features/events/types/show';
import { CameraGrid } from './CameraGrid';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  show: Show;
}

export function LivePlayer({ show }: LivePlayerProps) {
  const router = useRouter();
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

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
      <div className={styles.main}>
        <div className={styles.gridArea}>
          <CameraGrid
            cameras={show.cameras}
            title={show.title}
            subtitle={`${show.artist} · ${show.venue}`}
            onBack={() => router.push(`/events/${show.id}`)}
            onTitleClick={() => setShowInfo(true)}
          />
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
            <button onClick={() => setPlaying(!playing)} className={styles.playBtn}>
              {playing
                ? <Pause size={16} color="white" />
                : <Play size={16} color="white" fill="white" />
              }
            </button>
          </div>

          <div className={styles.timeArea}>
            <span className={styles.timeCode}>{formatTime(elapsed)}</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFillLive} />
            </div>
            <div className={styles.liveBadge}>
              <span className={styles.liveIndicator} />
              AO VIVO
            </div>
          </div>

          <div className={styles.rightControls}>
            <button onClick={() => setMuted(!muted)} className={styles.skipBtn}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={toggleFullscreen} className={styles.skipBtn}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
