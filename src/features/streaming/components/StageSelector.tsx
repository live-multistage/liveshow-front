'use client';

import type { LiveStage } from '../types/live.types';
import styles from './StageSelector.module.scss';

interface StageSelectorProps {
  stages: LiveStage[];
  activeId: string;
  onChange: (stageId: string) => void;
}

export function StageSelector({ stages, activeId, onChange }: StageSelectorProps) {
  return (
    <div className={styles.bar} role="tablist" aria-label="Palcos">
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
    </div>
  );
}
