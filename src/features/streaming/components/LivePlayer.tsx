'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize, Volume2, VolumeX, Settings } from 'lucide-react';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel } from './CameraGrid';
import { StageSelector } from './StageSelector';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  title: string;
  eventId: string;
}

function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

function useStages(cameras: LiveCamera[], rawStages?: LiveStage[]): LiveStage[] {
  return useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, cameras: [...s.cameras].sort((a, b) => a.priority - b.priority) }));
    }
    return [{ stageId: '__main__', name: 'Palco Principal', slug: 'main', position: 0, cameras: [...cameras].sort((a, b) => a.priority - b.priority) }];
  }, [cameras, rawStages]);
}

function initialStageId(stages: LiveStage[], primaryCameraId?: string | null): string {
  if (primaryCameraId) {
    const match = stages.find((s) => s.cameras.some((c) => c.cameraId === primaryCameraId));
    if (match) return match.stageId;
  }
  return stages.find((s) => s.cameras.length > 0)?.stageId ?? stages[0]?.stageId ?? '__main__';
}

export function LivePlayer({ cameras, stages: rawStages, primaryCameraId, title, eventId }: LivePlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Starts muted — browser autoplay policy requires it. Master on/off switch;
  // which single camera's audio plays while unmuted is audioCameraId below
  // (multiple simultaneous tile audio tracks would be a cacophony).
  const [globalMuted, setGlobalMuted] = useState(true);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const { user } = useAuth();

  useViewerTracking(eventId, user?.id);
  const { currentViewers } = useViewerCount(eventId);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQuality, setShowQuality] = useState(false);

  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const activeCameraCount = activeStage?.cameras.length ?? 0;
  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  // Falls back to the primary/first camera in the active stage — handles
  // both "never picked one" and "picked one, then switched to a stage that
  // doesn't have it."
  const effectiveAudioCameraId =
    audioCameraId && activeStage?.cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : (activeStage?.cameras[0]?.cameraId ?? null);

  return (
    <div ref={containerRef} className={styles.player}>
      {stages.length > 1 && (
        <StageSelector
          stages={stages}
          activeId={activeStageId}
          onChange={setActiveStageId}
        />
      )}

      <div className={styles.main}>
        <div className={styles.gridArea}>
          {activeStage && (
            <CameraGrid
              key={activeStage.stageId}
              cameras={activeStage.cameras}
              title={title}
              subtitle={`${activeCameraCount} ${activeCameraCount === 1 ? 'câmera' : 'câmeras'} ao vivo`}
              onBack={() => router.push(`/events/${eventId}`)}
              selectedLevel={currentLevel}
              onLevelsReady={setLevels}
              globalMuted={globalMuted}
              onGlobalMutedChange={setGlobalMuted}
              audioCameraId={effectiveAudioCameraId}
              onAudioCameraChange={(id) => { setAudioCameraId(id); setGlobalMuted(false); }}
            />
          )}
        </div>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.controls}>
          <div className={styles.timeArea}>
            <div className={styles.liveBadge}>
              <span className={styles.liveIndicator} />
              AO VIVO
            </div>
            {currentViewers > 0 && (
              <div className={styles.viewerBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {fmtCompact(currentViewers)} assistindo
              </div>
            )}
          </div>

          <div className={styles.rightControls}>
            <button
              onClick={() => setGlobalMuted((m) => !m)}
              className={styles.skipBtn}
              aria-label={globalMuted ? 'Ativar som' : 'Silenciar'}
              title={globalMuted ? 'Ativar som' : 'Silenciar'}
            >
              {globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {activeStage && activeStage.cameras.length > 1 && (
              <div className={styles.qualityWrapper}>
                {showAudioMenu && (
                  <div className={styles.qualityMenu}>
                    {activeStage.cameras.map((cam) => (
                      <button
                        key={cam.cameraId}
                        className={cam.cameraId === effectiveAudioCameraId ? styles.qualityItemActive : styles.qualityItem}
                        onClick={() => {
                          setAudioCameraId(cam.cameraId);
                          setGlobalMuted(false);
                          setShowAudioMenu(false);
                        }}
                      >
                        {cam.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  className={styles.skipBtn}
                  onClick={() => setShowAudioMenu((s) => !s)}
                  aria-label="Escolher câmera com áudio"
                  title="Escolher câmera com áudio"
                >
                  <Settings size={16} />
                </button>
              </div>
            )}
            {levels.length > 0 && (
              <div className={styles.qualityWrapper}>
                {showQuality && (
                  <div className={styles.qualityMenu}>
                    <button
                      className={currentLevel === -1 ? styles.qualityItemActive : styles.qualityItem}
                      onClick={() => { setCurrentLevel(-1); setShowQuality(false); }}
                    >
                      Auto
                    </button>
                    {levels.map(({ index, height }) => (
                      <button
                        key={index}
                        className={index === currentLevel ? styles.qualityItemActive : styles.qualityItem}
                        onClick={() => { setCurrentLevel(index); setShowQuality(false); }}
                      >
                        {height}p
                      </button>
                    ))}
                  </div>
                )}
                <button className={styles.qualityBtn} onClick={() => setShowQuality((s) => !s)}>
                  {qualityLabel}
                </button>
              </div>
            )}
            <button onClick={toggleFullscreen} className={styles.skipBtn}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
