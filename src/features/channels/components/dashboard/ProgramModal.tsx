'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@live-show/design-system';
import { DURATION_PRESETS, useProgramForm } from '../../hooks/useProgramForm';
import type { Program } from '../../types/channel.types';
import { DurationField } from './DurationField';
import { SummaryBox } from './SummaryBox';
import { WeekdayToggles } from './WeekdayToggles';
import styles from './ProgramModal.module.scss';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  slug: string;
  organizationId: string;
  channelName: string;
  // Fuso do canal — usado tanto no hint de horário quanto para conferir se o
  // evento vinculado cai dentro da janela do programa.
  timezone: string;
  // Presente = edição: os campos vêm do programa e o upsert leva o programId.
  program?: Program;
  onDone: () => void;
}

export function ProgramModal({
  open,
  onOpenChange,
  channelId,
  slug,
  organizationId,
  channelName,
  timezone,
  program,
  onDone,
}: Props) {
  const t = useTranslations('channels.program');
  const form = useProgramForm({ channelId, slug, organizationId, timezone, program, onDone });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            {t('eyebrow')} · {channelName.toUpperCase()}
          </span>
          <DialogTitle className={styles.title}>
            {t(form.isEdit ? 'editTitle' : 'newTitle')}
          </DialogTitle>
        </div>

        <form className={styles.form} onSubmit={form.handleSubmit}>
          <div className={styles.field}>
            <span className={styles.label}>
              <label htmlFor="program-name">{t('name')}</label>
              <span className={styles.required} aria-hidden="true">*</span>
            </span>
            <input
              id="program-name"
              className={styles.control}
              value={form.name}
              maxLength={80}
              placeholder={t('namePlaceholder')}
              onChange={(e) => form.setName(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <span className={styles.label}>
                <label htmlFor="program-start">{t('start')}</label>
                <span className={styles.required} aria-hidden="true">*</span>
              </span>
              <input
                id="program-start"
                type="time"
                className={`${styles.control} ${styles.controlMono}`}
                value={form.startTime}
                onChange={(e) => form.setStartTime(e.target.value)}
              />
              <span className={styles.hint}>{t('timezoneHint', { timezone: timezone.toUpperCase() })}</span>
            </div>

            <DurationField
              id="program-duration"
              label={t('duration')}
              suffix={t('durationSuffix')}
              value={form.durationMin}
              onChange={form.setDurationMin}
              presets={DURATION_PRESETS.map((minutes) => ({
                minutes,
                label: t(`durationPreset${minutes}`),
              }))}
              onPreset={form.applyDurationPreset}
              error={form.durationError}
            />
          </div>

          <WeekdayToggles
            legend={t('weekdays')}
            dayLabels={form.dayLabels}
            days={form.days}
            onToggleDay={form.toggleDay}
            quickPicks={[
              { label: t('presetWeekdays'), onClick: form.pickWeekdays },
              { label: t('presetAllDays'), onClick: form.pickAllDays },
            ]}
            error={form.daysError}
          />

          <SummaryBox
            label={t('summaryLabel')}
            summary={form.summary}
            placeholder={t('summaryPlaceholder')}
          />

          <div className={styles.footer}>
            {form.isEdit ? (
              <button
                type="button"
                className={styles.deleteLink}
                onClick={form.requestDelete}
                disabled={form.isDeleting}
              >
                {form.isDeleting
                  ? t('deleting')
                  : form.confirmingDelete
                    ? t('deleteConfirm')
                    : t('delete')}
              </button>
            ) : (
              <span />
            )}
            <div className={styles.footerActions}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!form.canSubmit || form.isPending}>
                {form.isPending ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
