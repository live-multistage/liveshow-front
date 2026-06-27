'use client';

import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';
import styles from './NavigationOverlay.module.scss';

export function NavigationOverlay() {
  const isNavigating = useNavigationLoadingStore((s) => s.isNavigating);

  if (!isNavigating) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.bar} />
      <div className={styles.spinner} />
    </div>
  );
}
