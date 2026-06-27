'use client';

import { Globe, EyeOff, Pencil, X, Check, StopCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/Button';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

const STATUS_MOD: Record<string, string> = {
  DRAFT: styles.statusDraft, PUBLISHED: styles.statusPublished, SCHEDULED: styles.statusPublished,
  LIVE: styles.statusLive, FINISHED: styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

interface Props {
  event: EventResponse;
  editing: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isFinishing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onFinish: () => void;
}

export function EventHeaderActions({
  event,
  editing,
  isSaving,
  isPublishing,
  isUnpublishing,
  isFinishing,
  onEdit,
  onCancelEdit,
  onSave,
  onPublish,
  onUnpublish,
  onFinish,
}: Props) {
  const t = useTranslations('eventDetail');
  const canEdit = event.status === 'DRAFT' || event.status === 'PUBLISHED' || event.status === 'SCHEDULED';
  const canPublish = event.status === 'DRAFT';
  const canUnpublish = event.status === 'PUBLISHED' || event.status === 'SCHEDULED';
  const canFinish = event.status === 'LIVE';

  return (
    <div className={styles.headerActions}>
      <span className={`${styles.status} ${STATUS_MOD[event.status]}`}>
        {event.status === 'LIVE' && <span className={styles.livePulse} />}
        {t(`status.${event.status}`)}
      </span>

      {canEdit && !editing && (
        <Button variant="outline" icon={<Pencil size={14} />} onClick={onEdit}>
          {t('edit')}
        </Button>
      )}

      {canPublish && !editing && (
        <Button
          variant="primary"
          icon={<Globe size={14} />}
          isLoading={isPublishing}
          loadingLabel={t('publishing')}
          onClick={onPublish}
        >
          {t('publish')}
        </Button>
      )}

      {canUnpublish && !editing && (
        <Button
          variant="outline"
          icon={<EyeOff size={14} />}
          isLoading={isUnpublishing}
          loadingLabel={t('unpublishing')}
          onClick={onUnpublish}
        >
          {t('unpublish')}
        </Button>
      )}

      {canFinish && (
        <Button
          variant="danger"
          icon={<StopCircle size={14} />}
          isLoading={isFinishing}
          loadingLabel={t('finishing')}
          onClick={onFinish}
        >
          {t('finish')}
        </Button>
      )}

      {editing && (
        <>
          <Button variant="outline" icon={<X size={14} />} onClick={onCancelEdit}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<Check size={14} />}
            isLoading={isSaving}
            loadingLabel={t('saving')}
            onClick={onSave}
          >
            {t('save')}
          </Button>
        </>
      )}
    </div>
  );
}
