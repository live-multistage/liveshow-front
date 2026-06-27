'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize } from 'lucide-react';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel } from './CameraGrid';
import { StageSelector } from './StageSelector';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useTrackStream } from '../hooks/use-track-stream';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  title: string;
  eventId: string;
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
  const { user } = useAuth();
  useTrackStream(eventId, user?.id);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [showQuality, setShowQuality] = useState(false);

  const activeStage =
    stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  const handleStageChange = (stageId: string) => {
    setActiveStageId(stageId);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const activeCameraCount = activeStage?.cameras.length ?? 0;
  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  return (
    <div ref={containerRef} className={styles.player}>
      {stages.length > 1 && (
        <StageSelector
          stages={stages}
          activeId={activeStageId}
          onChange={handleStageChange}
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
          </div>

          <div className={styles.rightControls}>
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
                <button
                  className={styles.qualityBtn}
                  onClick={() => setShowQuality((s) => !s)}
                >
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
