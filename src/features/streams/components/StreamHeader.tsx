'use client';

import { Button } from '@/shared/components/Button';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamBuilder.module.scss';

const STATUS_LABEL = {
  DRAFT: 'Rascunho', READY: 'Pronto', LIVE: 'Ao Vivo', ENDED: 'Encerrado', CANCELLED: 'Cancelado',
} as const;

const STATUS_MOD = {
  DRAFT: styles.badgeDraft, READY: styles.badgeReady, LIVE: styles.badgeLive,
  ENDED: styles.badgeEnded, CANCELLED: styles.badgeCancelled,
} as const;

export interface LifecycleAction {
  onClick: () => void;
  isPending: boolean;
}

interface Props {
  stream: StreamResponse;
  prepare: LifecycleAction;
  start: LifecycleAction;
  end: LifecycleAction;
  cancel: LifecycleAction;
}

export function StreamHeader({ stream, prepare, start, end, cancel }: Props) {
  const { status } = stream;
  const isTerminal = status === 'ENDED' || status === 'CANCELLED';

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={`${styles.badge} ${STATUS_MOD[status]}`}>
          {status === 'LIVE' && <span className={styles.pulse} />}
          {STATUS_LABEL[status]}
        </span>
        <h2 className={styles.streamTitle}>{stream.title}</h2>
        {stream.description && <p className={styles.streamDesc}>{stream.description}</p>}
      </div>

      {!isTerminal && (
        <div className={styles.lifecycle}>
          {status === 'DRAFT' && (
            <Button
              variant="info"
              size="sm"
              uppercase
              isLoading={prepare.isPending}
              onClick={prepare.onClick}
            >
              Preparar
            </Button>
          )}
          {status === 'READY' && (
            <Button
              variant="success"
              size="sm"
              uppercase
              isLoading={start.isPending}
              onClick={start.onClick}
            >
              Iniciar
            </Button>
          )}
          {status === 'LIVE' && (
            <Button
              variant="danger"
              size="sm"
              uppercase
              isLoading={end.isPending}
              onClick={end.onClick}
            >
              Encerrar
            </Button>
          )}
          {(status === 'DRAFT' || status === 'READY') && (
            <Button
              variant="subtle"
              size="sm"
              uppercase
              isLoading={cancel.isPending}
              onClick={cancel.onClick}
            >
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
