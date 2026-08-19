'use client';

import { useEffect, useState } from 'react';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';
import styles from './NavigationOverlay.module.scss';

// guitarra, bola, carro, maleta, ingresso — categorias genéricas do catálogo
const ICON_PATHS = [
  'M18 3l3 3-8.5 8.5a3.5 3.5 0 1 1-3-3L18 3Z M15.5 5.5l3 3 M8.2 13.4l2.4 2.4',
  'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8l3.4 2.5-1.3 4h-4.2l-1.3-4L12 8Z M12 3v5 M3.6 9.5l4.3 1 M6.4 18.4l2.7-3.4 M17.6 18.4l-2.7-3.4 M20.4 9.5l-4.3 1',
  'M3 13l2-5.5a3 3 0 0 1 2.8-2h8.4a3 3 0 0 1 2.8 2L21 13v5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5Z M3 13h18 M7 16.5h.01 M17 16.5h.01',
  'M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 13h18',
  'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7Z M12 5v14',
];

const CYCLE_MS = 2000;

export function NavigationOverlay() {
  const isNavigating = useNavigationLoadingStore((s) => s.isNavigating);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!isNavigating) return;
    const timer = setInterval(() => setI((n) => (n + 1) % ICON_PATHS.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.spinnerWrap} style={{ '--lo-dur': `${CYCLE_MS}ms` } as React.CSSProperties}>
        <div className={styles.ring}>
          <svg width={76} height={76} viewBox="0 0 76 76" className={styles.ringSvg}>
            <circle cx={38} cy={38} r={34} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={3} />
            <circle
              cx={38}
              cy={38}
              r={34}
              fill="none"
              stroke="#ff2e9e"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="58 156"
            />
          </svg>
        </div>
        <svg
          key={i}
          width={34}
          height={34}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <path d={ICON_PATHS[i]} pathLength={1} className={styles.iconPath} />
        </svg>
      </div>
      <div className={styles.caption}>CARREGANDO</div>
    </div>
  );
}
