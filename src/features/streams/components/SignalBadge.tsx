'use client';

import { useTranslations } from 'next-intl';
import type { TranscodeStatus } from '../types/stream.types';
import styles from './StreamBuilder.module.scss';

interface Props {
  live: boolean;                 // ingest session present (publisher pushing)
  jobStatus?: TranscodeStatus;   // transcode job state, if any
}

export function SignalBadge({ live, jobStatus }: Props) {
  const t = useTranslations('controlRoom');
  // Transcode failure is the loudest signal — show it first.
  if (jobStatus === 'FAILED') {
    return <span className={`${styles.signal} ${styles.signalError}`}>{t('transcodeFailed')}</span>;
  }
  if (!live) {
    return <span className={`${styles.signal} ${styles.signalIdle}`}>{t('noSignal')}</span>;
  }
  return (
    <span className={`${styles.signal} ${styles.signalLive}`}>
      <span className={styles.signalDot} />
      {jobStatus ? t(`job${jobStatus}`) : t('receivingSignal')}
    </span>
  );
}
