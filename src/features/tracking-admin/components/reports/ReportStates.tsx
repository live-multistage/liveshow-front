'use client';

import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Skeleton } from '@live-show/design-system';
import styles from './ReportsShared.module.scss';

export function TimeoutBanner({ text }: { text: string }) {
  return (
    <div className={styles.timeoutBanner} role="status">
      <Clock size={16} />
      <span>{text}</span>
    </div>
  );
}

export function ReportMessageState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className={styles.stateBox}>
      <div className={styles.stateIcon}>{icon}</div>
      <p className={styles.stateTitle}>{text}</p>
    </div>
  );
}

export function ReportLoadingSkeleton() {
  return <Skeleton className={styles.skeletonBlock} />;
}
