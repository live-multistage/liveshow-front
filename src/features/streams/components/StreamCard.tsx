'use client';

import type { StreamResponse, StreamStatus } from '../types/stream.types';
import styles from './StreamCard.module.scss';

const STATUS_LABEL: Record<StreamStatus, string> = {
  DRAFT:     'Rascunho',
  READY:     'Pronto',
  LIVE:      'Ao Vivo',
  ENDED:     'Encerrado',
  CANCELLED: 'Cancelado',
};

const STATUS_MOD: Record<StreamStatus, string> = {
  DRAFT:     styles.badgeDraft,
  READY:     styles.badgeReady,
  LIVE:      styles.badgeLive,
  ENDED:     styles.badgeEnded,
  CANCELLED: styles.badgeCancelled,
};

interface Props {
  stream: StreamResponse;
  active: boolean;
  onClick: () => void;
}

export function StreamCard({ stream, active, onClick }: Props) {
  return (
    <div
      className={`${styles.card} ${active ? styles.active : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <div className={styles.top}>
        <p className={styles.title}>{stream.title}</p>
        <span className={`${styles.badge} ${STATUS_MOD[stream.status]}`}>
          {stream.status === 'LIVE' && <span className={styles.pulse} />}
          {STATUS_LABEL[stream.status]}
        </span>
      </div>
      {stream.description && (
        <p className={styles.description}>{stream.description}</p>
      )}
    </div>
  );
}
