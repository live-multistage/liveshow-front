'use client';

import { CameraCutLoader } from '@/shared/components/CameraCutLoader';
import styles from './LiveGateLoading.module.scss';

interface Props {
  message?: string;
  eventTitle?: string;
}

export function LiveGateLoading({ message, eventTitle }: Props) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <CameraCutLoader label={message} />
      {eventTitle && <h1 className={styles.eventTitle}>{eventTitle}</h1>}
    </div>
  );
}
