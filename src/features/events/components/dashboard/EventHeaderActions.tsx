'use client';

import { useState } from 'react';
import { Globe, EyeOff, Pencil, X, Check, StopCircle, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/Button';
import type { EventResponse } from '../../types/event.types';
import { ResumeLiveDialog } from './ResumeLiveDialog';
import styles from './EventDashboardDetailContent.module.scss';

const STATUS_MOD: Record<string, string> = {
  DRAFT: styles.statusDraft, PUBLISHED: styles.statusPublished, SCHEDULED: styles.statusPublished,
  LIVE: styles.statusLive, FINISHED: styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

// Org admins can undo an accidental "finish event" click within this window.
const RESUME_WINDOW_MS = 30 * 60 * 1000;

interface Props {
  event: EventResponse;
  editing: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isFinishing: boolean;
  isResuming: boolean;
  publishBlocked?: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onFinish: () => void;
  onResumeLive: () => void;
}

export function EventHeaderActions({
  event,
  editing,
  isSaving,
  isPublishing,
  isUnpublishing,
  isFinishing,
  isResuming,
  publishBlocked = false,
  onEdit,
  onCancelEdit,
  onSave,
  onPublish,
  onUnpublish,
  onFinish,
  onResumeLive,
}: Props) {
  const t = useTranslations('eventDetail');
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const canEdit = event.status === 'DRAFT' || event.status === 'PUBLISHED' || event.status === 'SCHEDULED';
  const canPublish = event.status === 'DRAFT';
  const canUnpublish = event.status === 'PUBLISHED' || event.status === 'SCHEDULED';
  const canFinish = event.status === 'LIVE';

  const finishedAtMs = event.finishedAt ? new Date(event.finishedAt).getTime() : null;
  const resumeElapsedMs = finishedAtMs !== null ? Date.now() - finishedAtMs : null;
  const canResume =
    event.status === 'FINISHED' && resumeElapsedMs !== null && resumeElapsedMs < RESUME_WINDOW_MS;
  const resumeMinutesLeft = canResume
    ? Math.max(1, Math.ceil((RESUME_WINDOW_MS - resumeElapsedMs!) / 60_000))
    : 0;

  function handleResumeConfirm() {
    onResumeLive();
    setResumeDialogOpen(false);
  }

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
          disabled={publishBlocked}
          title={publishBlocked ? t('publishBlockedLibras') : undefined}
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

      {canResume && (
        <>
          <Button
            variant="outline"
            icon={<RotateCcw size={14} />}
            isLoading={isResuming}
            loadingLabel={t('resuming')}
            onClick={() => setResumeDialogOpen(true)}
          >
            {t('resumeLive', { minutes: resumeMinutesLeft })}
          </Button>
          <ResumeLiveDialog
            open={resumeDialogOpen}
            onOpenChange={setResumeDialogOpen}
            onConfirm={handleResumeConfirm}
            isPending={isResuming}
          />
        </>
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
