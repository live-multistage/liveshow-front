'use client';

import type { StreamResponse, StreamStatus } from '../types/stream.types';
import styles from './StreamCard.module.scss';

const STATUS_LABEL: Record<StreamStatus, string> = {
  DRAFT:     'RASCUNHO',
  READY:     'PRONTO',
  LIVE:      'AO VIVO',
  ENDED:     'ENCERRADO',
  CANCELLED: 'CANCELADO',
};

interface Props {
  stream: StreamResponse;
  active: boolean;
  onClick: () => void;
}

export function StreamCard({ stream, active, onClick }: Props) {
  const isLive = stream.status === 'LIVE';

  return (
    <button
      type="button"
      className={`${styles.card} ${active ? styles.active : ''}`}
      onClick={onClick}
    >
      {active && <div className={styles.glow} />}

      <div className={styles.top}>
        <span className={styles.title}>{stream.title}</span>
        {isLive ? (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            AO VIVO
          </span>
        ) : (
          <span className={`${styles.statusBadge} ${styles[`status${stream.status}`]}`}>
            {STATUS_LABEL[stream.status]}
          </span>
        )}
      </div>

      {stream.description && (
        <p className={styles.description}>{stream.description}</p>
      )}
    </button>
  );
}
