'use client';

import { useEffect, useState } from 'react';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';
import styles from './NavigationOverlay.module.scss';

// categorias genéricas do catálogo, uma por pôster do baralho
const CATEGORIES = ['Shows', 'Esportes', 'Automotivo', 'Corporativo', 'Entretenimento'];

const CYCLE_MS = 2400;

export function NavigationOverlay() {
  const isNavigating = useNavigationLoadingStore((s) => s.isNavigating);
  const [front, setFront] = useState(0);

  useEffect(() => {
    if (!isNavigating) return;
    const timer = setInterval(() => setFront((n) => (n + 1) % CATEGORIES.length), CYCLE_MS);
    return () => clearInterval(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div className={styles.overlay} role="status">
      <div className={styles.deck} aria-hidden="true">
        {CATEGORIES.map((category, k) => (
          <div
            key={category}
            className={styles.card}
            // 0 = front, 1–3 = stacked behind, 4 = just dealt out
            data-pos={(k - front + CATEGORIES.length) % CATEGORIES.length}
          >
            <span className={styles.cardDot} />
            <span className={styles.cardNum}>{String(k + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className={styles.labels}>
        <span className={styles.category}>{CATEGORIES[front]}</span>
        <span className={styles.caption}>CARREGANDO</span>
      </div>
    </div>
  );
}
