'use client';

import type { TranscodeStatus } from '../types/stream.types';
import styles from './StreamBuilder.module.scss';

interface Props {
  live: boolean;                 // ingest session present (publisher pushing)
  jobStatus?: TranscodeStatus;   // transcode job state, if any
}

const JOB_LABEL: Record<TranscodeStatus, string> = {
  PENDING: 'Iniciando',
  RUNNING: 'Transcodificando',
  ENDED: 'Encerrado',
  FAILED: 'Falhou',
};

export function SignalBadge({ live, jobStatus }: Props) {
  // Transcode failure is the loudest signal — show it first.
  if (jobStatus === 'FAILED') {
    return <span className={`${styles.signal} ${styles.signalError}`}>Falha no transcode</span>;
  }
  if (!live) {
    return <span className={`${styles.signal} ${styles.signalIdle}`}>Sem sinal</span>;
  }
  return (
    <span className={`${styles.signal} ${styles.signalLive}`}>
      <span className={styles.signalDot} />
      {jobStatus ? JOB_LABEL[jobStatus] : 'Recebendo sinal'}
    </span>
  );
}
