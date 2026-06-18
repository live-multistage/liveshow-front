'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useDeleteStreamMutation } from '../mutations/stream.mutations';
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
  rollback: LifecycleAction;
  onRename: (title: string, description?: string) => Promise<unknown>;
  isRenaming: boolean;
  onDeleted?: (id: string) => void;
}

export function StreamHeader({
  stream, prepare, start, end, cancel, rollback, onRename, isRenaming, onDeleted,
}: Props) {
  const { status } = stream;
  const isTerminal = status === 'ENDED' || status === 'CANCELLED';
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(stream.title);
  const [description, setDescription] = useState(stream.description ?? '');
  const [renameError, setRenameError] = useState<string | null>(null);
  const del = useDeleteStreamMutation(stream.eventId, onDeleted);

  // Builder stays mounted across stream selection changes (no key), so re-seed
  // the edit inputs when a different stream is selected to avoid stale values.
  useEffect(() => {
    setTitle(stream.title);
    setDescription(stream.description ?? '');
    setEditing(false);
  }, [stream.id]);

  const canEdit = status === 'DRAFT' || status === 'READY';

  if (editing) {
    return (
      <div className={styles.header}>
        <div className={styles.editRow}>
          <input className={styles.editInput} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <input
            className={styles.editInput}
            value={description}
            placeholder="Descrição"
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            size="sm" variant="success" isLoading={isRenaming}
            onClick={async () => {
              if (!title.trim()) return;
              setRenameError(null);
              try {
                await onRename(title.trim(), description.trim() || undefined);
                setEditing(false);
              } catch {
                setRenameError('Falha ao salvar. Tente novamente.');
              }
            }}
          >
            Salvar
          </Button>
          <Button size="sm" variant="subtle" onClick={() => setEditing(false)}>Cancelar</Button>
          {renameError && <span className={styles.streamDesc}>{renameError}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={`${styles.badge} ${STATUS_MOD[status]}`}>
          {status === 'LIVE' && <span className={styles.pulse} />}
          {STATUS_LABEL[status]}
        </span>
        <h2 className={styles.streamTitle}>{stream.title}</h2>
        {stream.description && <p className={styles.streamDesc}>{stream.description}</p>}
        <div className={styles.streamActionsWrap}>
          {canEdit && (
            <button className={styles.headerIconBtn} title="Editar" onClick={() => setEditing(true)}>
              <Pencil size={13} />
            </button>
          )}
          {canEdit && (
            <button
              className={styles.headerIconBtn}
              title="Excluir"
              onClick={() => {
                if (confirm('Excluir esta stream? Esta ação não pode ser desfeita.')) {
                  del.mutate(stream.id);
                }
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {!isTerminal && (
        <div className={styles.lifecycle}>
          {status === 'DRAFT' && (
            <Button variant="info" size="sm" uppercase isLoading={prepare.isPending} onClick={prepare.onClick}>
              Preparar
            </Button>
          )}
          {status === 'READY' && (
            <Button variant="success" size="sm" uppercase isLoading={start.isPending} onClick={start.onClick}>
              Iniciar
            </Button>
          )}
          {status === 'LIVE' && (
            <>
              <Button variant="danger" size="sm" uppercase isLoading={end.isPending} onClick={end.onClick}>
                Encerrar
              </Button>
              <Button variant="subtle" size="sm" uppercase isLoading={rollback.isPending} onClick={rollback.onClick}>
                Pausar
              </Button>
            </>
          )}
          {(status === 'DRAFT' || status === 'READY') && (
            <Button variant="subtle" size="sm" uppercase isLoading={cancel.isPending} onClick={cancel.onClick}>
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
