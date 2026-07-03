'use client';

import { ChevronLeft } from 'lucide-react';
import type { LiveStage } from '../types/live.types';
import styles from './StageSelector.module.scss';

interface StageSelectorProps {
  stages: LiveStage[];
  activeId: string;
  onChange: (stageId: string) => void;
  onBack: () => void;
}

// Always renders the back button, regardless of stage count — the "Palcos"
// label/tabs only add on top of it once there's more than one stage to
// choose between. This is the single top bar for the whole live player.
export function StageSelector({ stages, activeId, onChange, onBack }: StageSelectorProps) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Palcos">
      <button onClick={onBack} className={styles.backBtn} aria-label="Voltar">
        <ChevronLeft size={18} />
      </button>
      {stages.length > 1 && (
        <>
          <span className={styles.label}>Palcos</span>
          {stages.map((stage) => (
            <button
              key={stage.stageId}
              role="tab"
              aria-selected={stage.stageId === activeId}
              className={`${styles.tab} ${stage.stageId === activeId ? styles.tabActive : ''}`}
              onClick={() => onChange(stage.stageId)}
            >
              <span className={styles.tabDot} aria-hidden="true" />
              {stage.name}
              <span className={styles.tabCount}>
                {stage.cameras.length} câm.
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
