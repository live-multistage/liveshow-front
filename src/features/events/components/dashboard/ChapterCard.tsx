'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ChevronDown, Trash2, TriangleAlert, X } from 'lucide-react';
import { Input, Textarea } from '@live-show/design-system';
import type { ReplayChapterSuggestionIssue } from '@live-show/api-contracts';
import { chapterDuration } from '@/features/streaming/utils/chapter-track';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  parseOffset,
  type ChapterDraft,
  type DraftError,
} from '../../utils/replay-chapter-drafts';
import styles from './ChapterCard.module.scss';

export interface NamedOption {
  id: string;
  name: string;
}

interface Props {
  draft: ChapterDraft;
  index: number;
  error: DraftError | null;
  serverMessage: string | null;
  multiStage: boolean;
  stages: NamedOption[];
  lineup: NamedOption[];
  artistNames: ReadonlyMap<string, string>;
  replayDuration: string;
  onChange: (patch: Partial<ChapterDraft>) => void;
  onRemove: () => void;
  onTimeBlur: () => void;
}

type Field = 'start' | 'end' | 'title' | 'description';

const TITLE_COUNTER_FROM = 100;

const ERROR_KEY = {
  START_REQUIRED: 'errStartRequired',
  START_INVALID: 'errStartInvalid',
  END_REQUIRED: 'errEndRequired',
  END_INVALID: 'errEndInvalid',
  END_BEFORE_START: 'errEndBeforeStart',
  AFTER_REPLAY: 'errAfterReplay',
  TITLE_REQUIRED: 'errTitleRequired',
  TITLE_TOO_LONG: 'errTitleTooLong',
  DESCRIPTION_TOO_LONG: 'errDescriptionTooLong',
} as const;

const ERROR_FIELD: Record<keyof typeof ERROR_KEY, Field> = {
  START_REQUIRED: 'start',
  START_INVALID: 'start',
  END_REQUIRED: 'end',
  END_INVALID: 'end',
  END_BEFORE_START: 'end',
  AFTER_REPLAY: 'end',
  TITLE_REQUIRED: 'title',
  TITLE_TOO_LONG: 'title',
  DESCRIPTION_TOO_LONG: 'description',
};

const WARNING_KEY: Record<ReplayChapterSuggestionIssue, string> = {
  NO_END_TIME: 'warnNoEndTime',
  OUTSIDE_TIMELINE: 'warnOutsideTimeline',
  MULTI_STAGE: 'warnMultiStage',
  OVERLAP: 'warnOverlap',
};

function fieldOf(error: DraftError | null): Field | null {
  if (!error) return null;
  return typeof error === 'object' ? 'start' : ERROR_FIELD[error];
}

export const chapterNumber = (index: number) => String(index + 1).padStart(2, '0');

export function ChapterCard({
  draft, index, error, serverMessage, multiStage, stages, lineup, artistNames, replayDuration,
  onChange, onRemove, onTimeBlur,
}: Props) {
  const t = useTranslations('replayChaptersEditor');
  const uid = useId();
  const label = t('chapterLabel', { n: chapterNumber(index) });

  const field: Field | null = serverMessage ? 'end' : fieldOf(error);
  const message = serverMessage ?? errorMessage(error);

  function durationText(): string {
    const start = parseOffset(draft.startText);
    const end = parseOffset(draft.endText);
    if (start === null || end === null || end <= start) return '—';
    const { unit, count } = chapterDuration(end - start);
    return t(unit === 's' ? 'durationSec' : 'durationMin', { count });
  }

  function errorMessage(e: DraftError | null): string | null {
    if (!e) return null;
    if (typeof e === 'object') return t('errOverlap', { n: chapterNumber(e.withIndex) });
    if (e === 'AFTER_REPLAY') return t('errAfterReplay', { duration: replayDuration });
    if (e === 'TITLE_TOO_LONG') return t('errTitleTooLong', { max: TITLE_MAX });
    if (e === 'DESCRIPTION_TOO_LONG') return t('errDescriptionTooLong', { max: DESCRIPTION_MAX });
    return t(ERROR_KEY[e]);
  }

  const unusedArtists = lineup.filter((a) => !draft.artistIds.includes(a.id));
  const invalid = (f: Field) => field === f || undefined;

  return (
    <div
      role="group"
      aria-label={label}
      className={`${styles.card} ${message ? styles.cardError : draft.importIssues.length ? styles.cardWarn : ''}`}
    >
      <div className={styles.top}>
        <span className={styles.ord}>{label}</span>
        <span className={styles.duration}>{durationText()}</span>
        <button type="button" className={styles.remove} aria-label={t('remove')} onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>

      <div className={`${styles.grid} ${multiStage ? styles.gridMulti : ''}`}>
        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`} htmlFor={`${uid}-start`}>{t('startLabel')}</label>
          <Input
            id={`${uid}-start`}
            className={`${styles.input} ${styles.mono}`}
            placeholder="0:00:00"
            value={draft.startText}
            aria-invalid={invalid('start')}
            onChange={(e) => onChange({ startText: e.target.value })}
            onBlur={onTimeBlur}
          />
        </div>
        <div className={styles.field}>
          <label className={`${styles.label} ${styles.required}`} htmlFor={`${uid}-end`}>{t('endLabel')}</label>
          <Input
            id={`${uid}-end`}
            className={`${styles.input} ${styles.mono}`}
            placeholder="0:00:00"
            value={draft.endText}
            aria-invalid={invalid('end')}
            onChange={(e) => onChange({ endText: e.target.value })}
            onBlur={onTimeBlur}
          />
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <div className={styles.labelRow}>
            <label className={`${styles.label} ${styles.required}`} htmlFor={`${uid}-title`}>{t('titleLabel')}</label>
            {draft.title.length > TITLE_COUNTER_FROM && (
              <span className={draft.title.length >= TITLE_MAX ? styles.counterFull : styles.counter}>
                {draft.title.length}/{TITLE_MAX}
              </span>
            )}
          </div>
          <Input
            id={`${uid}-title`}
            className={styles.input}
            placeholder={t('titlePlaceholder')}
            maxLength={TITLE_MAX}
            value={draft.title}
            aria-invalid={invalid('title')}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>
        {multiStage && (
          <div className={`${styles.field} ${styles.full}`}>
            <label className={styles.label} htmlFor={`${uid}-stage`}>{t('stageLabel')}</label>
            <div className={styles.selectWrap}>
              <select
                id={`${uid}-stage`}
                className={`${styles.select} ${draft.stageId ? styles.selectActive : ''}`}
                value={draft.stageId ?? ''}
                onChange={(e) => onChange({ stageId: e.target.value || null })}
              >
                <option value="">{t('allStages')}</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={13} className={styles.chevron} aria-hidden />
            </div>
          </div>
        )}
      </div>

      <div className={styles.artists}>
        <span className={styles.label}>{t('artistsLabel')}</span>
        <div className={styles.artistBox}>
          {draft.artistIds.map((id) => {
            const name = artistNames.get(id) ?? id;
            return (
              <span key={id} className={styles.artistChip}>
                {name}
                <button
                  type="button"
                  className={styles.artistRemove}
                  aria-label={t('artistRemove', { name })}
                  onClick={() => onChange({ artistIds: draft.artistIds.filter((a) => a !== id) })}
                >
                  <X size={11} strokeWidth={2.6} />
                </button>
              </span>
            );
          })}
          {unusedArtists.length > 0 && (
            <div className={styles.artistAdd}>
              <select
                className={styles.artistSelect}
                aria-label={t('artistAdd')}
                value=""
                onChange={(e) => e.target.value && onChange({ artistIds: [...draft.artistIds, e.target.value] })}
              >
                <option value="">{t('artistAdd')}</option>
                {unusedArtists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <ChevronDown size={12} className={styles.chevron} aria-hidden />
            </div>
          )}
        </div>
      </div>

      <Textarea
        className={styles.description}
        rows={2}
        maxLength={DESCRIPTION_MAX}
        placeholder={t('descriptionPlaceholder')}
        aria-label={t('descriptionPlaceholder')}
        value={draft.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />

      {message && (
        <p className={styles.errorLine}><AlertCircle size={13} aria-hidden />{message}</p>
      )}
      {draft.importIssues.map((issue) => (
        <p key={issue} className={styles.warnLine}><TriangleAlert size={13} aria-hidden />{t(WARNING_KEY[issue])}</p>
      ))}
    </div>
  );
}
