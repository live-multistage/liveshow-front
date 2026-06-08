'use client';

import { Globe, EyeOff, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', PUBLISHED: 'Publicado', LIVE: 'Ao Vivo',
  FINISHED: 'Encerrado', CANCELLED: 'Cancelado',
};

const STATUS_MOD: Record<string, string> = {
  DRAFT: styles.statusDraft, PUBLISHED: styles.statusPublished,
  LIVE: styles.statusLive, FINISHED: styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

interface Props {
  event: EventResponse;
  editing: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function EventHeaderActions({
  event,
  editing,
  isSaving,
  isPublishing,
  isUnpublishing,
  onEdit,
  onCancelEdit,
  onSave,
  onPublish,
  onUnpublish,
}: Props) {
  const canEdit = event.status === 'DRAFT' || event.status === 'PUBLISHED';
  const canPublish = event.status === 'DRAFT';
  const canUnpublish = event.status === 'PUBLISHED';

  return (
    <div className={styles.headerActions}>
      <span className={`${styles.status} ${STATUS_MOD[event.status]}`}>
        {event.status === 'LIVE' && <span className={styles.livePulse} />}
        {STATUS_LABEL[event.status]}
      </span>

      {canEdit && !editing && (
        <Button variant="outline" icon={<Pencil size={14} />} onClick={onEdit}>
          Editar
        </Button>
      )}

      {canPublish && !editing && (
        <Button
          variant="primary"
          icon={<Globe size={14} />}
          isLoading={isPublishing}
          loadingLabel="Publicando..."
          onClick={onPublish}
        >
          Publicar
        </Button>
      )}

      {canUnpublish && !editing && (
        <Button
          variant="outline"
          icon={<EyeOff size={14} />}
          isLoading={isUnpublishing}
          loadingLabel="Despublicando..."
          onClick={onUnpublish}
        >
          Despublicar
        </Button>
      )}

      {editing && (
        <>
          <Button variant="outline" icon={<X size={14} />} onClick={onCancelEdit}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon={<Check size={14} />}
            isLoading={isSaving}
            loadingLabel="Salvando..."
            onClick={onSave}
          >
            Salvar
          </Button>
        </>
      )}
    </div>
  );
}
