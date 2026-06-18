'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize } from 'lucide-react';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import { StageSelector } from './StageSelector';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];   // flat list — always present (backward compat)
  stages?: LiveStage[];    // grouped by stage — present when backend supports it
  title: string;
  eventId: string;
}

// Normalises the flat cameras list and optional stages into a unified stages
// array. When the backend sends stages, use them directly. Otherwise wrap all
// cameras into a single synthetic "Palco Principal" stage so the rest of the
// component always works with the same data shape.
function useStages(cameras: LiveCamera[], rawStages?: LiveStage[]): LiveStage[] {
  return useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages].sort((a, b) => a.position - b.position);
    }
    return [{ stageId: '__main__', name: 'Palco Principal', slug: 'main', position: 0, cameras }];
  }, [cameras, rawStages]);
}

export function LivePlayer({ cameras, stages: rawStages, title, eventId }: LivePlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => stages[0]?.stageId ?? '__main__');

  // Keep activeStageId valid if stages change (e.g. a stage goes offline)
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
            <button onClick={toggleFullscreen} className={styles.skipBtn}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
