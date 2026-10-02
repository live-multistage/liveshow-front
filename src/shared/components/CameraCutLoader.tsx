'use client';

import { useEffect, useState } from 'react';
import styles from './CameraCutLoader.module.scss';

interface Props {
  label?: string;
}

const TICK_MS = 60;
const CUT_MS = 300;
// Director cut order: CUT_ORDER[tile] is the step at which that tile goes live.
const CUT_ORDER = [0, 5, 2, 7, 4, 1, 8, 3, 6];

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatTimecode(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const frames = Math.floor((elapsedMs % 1000) / (1000 / 30));
  return `00:${pad2(Math.floor(totalSeconds / 60) % 60)}:${pad2(totalSeconds % 60)}:${pad2(frames)}`;
}

function useElapsed(): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - start), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

export function CameraCutLoader({ label }: Props) {
  const elapsed = useElapsed();
  const step = Math.floor(elapsed / CUT_MS) % CUT_ORDER.length;
  const previousStep = (step + CUT_ORDER.length - 1) % CUT_ORDER.length;

  return (
    <div className={styles.loader}>
      <div className={styles.hud} aria-hidden="true">
        <span className={styles.rec}>
          <span className={styles.recDot} />
          REC
        </span>
        <span>{formatTimecode(elapsed)}</span>
      </div>

      <div className={styles.grid} aria-hidden="true">
        {CUT_ORDER.map((cutStep, tile) => (
          <div
            key={tile}
            className={styles.tile}
            data-state={cutStep === step ? 'live' : cutStep === previousStep ? 'fading' : undefined}
          >
            <span className={styles.tileLabel}>CAM {pad2(tile + 1)}</span>
          </div>
        ))}
        <div className={styles.scan} />
      </div>

      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
