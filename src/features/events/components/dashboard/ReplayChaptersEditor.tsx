'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Lock, Plus } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@live-show/design-system';
import type { ReplayChapter, ReplayEventTimeline } from '@live-show/api-contracts';
import { useEventLineup } from '@/features/artists';
import { useEventStagesQuery } from '@/features/streams/queries/streams.queries';
import { formatOffset } from '../../utils/replay-chapter-drafts';
import { useEventSchedule } from '../../hooks/use-event-schedule';
import { MAX_CHAPTERS, useReplayChaptersForm } from '../../hooks/use-replay-chapters-form';
import { ChapterCard, chapterNumber } from './ChapterCard';
import { ChapterPreview } from './ChapterPreview';
import { ChaptersEmpty, ChaptersHeader, ChaptersUnavailable } from './ChaptersShell';
import styles from './ReplayChapters.module.scss';

interface Props {
  eventId: string;
  chapters: ReplayChapter[];
  window: ReplayEventTimeline;
  readOnly: boolean;
}

export function ReplayChaptersEditor({ eventId, chapters, window, readOnly }: Props) {
  const t = useTranslations('replayChaptersEditor');
  const { stages } = useEventStagesQuery(eventId);
  const { data: lineup = [] } = useEventLineup(eventId);
  const { data: schedule } = useEventSchedule(eventId);
  const multiStage = stages.length > 1;
  const hasSchedule = (schedule?.length ?? 0) > 0;

  const stageIds = useMemo(() => stages.map((s) => s.id), [stages]);
  const form = useReplayChaptersForm({ eventId, chapters, window, multiStage, stageIds });

  const spanMs = window.endsAtMs - window.startsAtMs;
  const replayDuration = formatOffset(spanMs, spanMs);
  const stageOptions = useMemo(() => stages.map((s) => ({ id: s.id, name: s.name })), [stages]);
  // Not-declined only for picking; every lineup name for display, so a chapter
  // that still lists an artist who later declined keeps showing their name.
  const lineupOptions = useMemo(
    () => lineup.filter((l) => l.status !== 'DECLINED').map((l) => ({ id: l.artist.id, name: l.artist.name })),
    [lineup],
  );
  const artistNames = useMemo(() => {
    const names = new Map<string, string>();
    chapters.forEach((c) => c.artists.forEach((a) => names.set(a.id, a.name)));
    lineup.forEach((l) => names.set(l.artist.id, l.artist.name));
    return names;
  }, [chapters, lineup]);

  if (form.replayGone) {
    return (
      <>
        <ChaptersHeader />
        <ChaptersUnavailable kind="processing" />
      </>
    );
  }

  const invalidKeys = new Set(form.drafts.filter((d, i) => form.errors[i].length > 0 || form.serverError === d.key || form.unknownStageKeys.has(d.key)).map((d) => d.key));
  const preview = (
    <ChapterPreview
      drafts={form.drafts}
      invalidKeys={invalidKeys}
      spanMs={spanMs}
      replayDuration={replayDuration}
      multiStage={multiStage}
      stages={stageOptions}
    />
  );

  if (readOnly) {
    return (
      <>
        <ChaptersHeader>
          <span className={styles.readOnlyBadge}><Lock size={12} aria-hidden />{t('readOnly')}</span>
        </ChaptersHeader>
        {form.drafts.length === 0 ? <ChaptersEmpty /> : (
          <>
            {preview}
            <ol className={styles.readList}>
              {form.drafts.map((d, i) => (
                <li key={d.key} className={styles.readRow}>
                  <span className={styles.ord}>{t('chapterLabel', { n: chapterNumber(i) })}</span>
                  <span className={styles.range}>{d.startText} – {d.endText}</span>
                  <div>
                    <div className={styles.readTitle}>{d.title}</div>
                    {d.description && <div className={styles.readDescription}>{d.description}</div>}
                    {d.artistIds.length > 0 && (
                      <div className={styles.readArtists}>
                        {d.artistIds.map((id) => <span key={id} className={styles.readArtist}>{artistNames.get(id) ?? id}</span>)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </>
    );
  }

  const hasRows = form.drafts.length > 0;

  return (
    <>
      <ChaptersHeader>
        <div className={styles.headerActions}>
          <span className={`${styles.dirty} ${form.dirty ? styles.dirtyOn : ''}`}>{form.dirty ? t('dirty') : t('clean')}</span>
          {hasRows && hasSchedule && (
            <Button type="button" variant="outline" onClick={form.requestImport} disabled={form.importing}>
              <Download aria-hidden />{t('import')}
            </Button>
          )}
        </div>
      </ChaptersHeader>

      {!hasRows ? <ChaptersEmpty hasSchedule={hasSchedule} importing={form.importing} onImport={form.requestImport} onAdd={form.add} /> : (
        <>
          {preview}
          <div className={styles.cards}>
            {form.drafts.map((d, i) => (
              <ChapterCard
                key={d.key}
                draft={d}
                index={i}
                error={form.errors[i][0] ?? null}
                serverRejected={form.serverError === d.key}
                unknownStage={form.unknownStageKeys.has(d.key)}
                multiStage={multiStage}
                stages={stageOptions}
                lineup={lineupOptions}
                artistNames={artistNames}
                replayDuration={replayDuration}
                onChange={(patch) => form.update(d.key, patch)}
                onRemove={() => form.remove(d.key)}
                onTimeBlur={form.sort}
              />
            ))}
          </div>
          <button type="button" className={styles.addCard} onClick={form.add} disabled={form.atLimit}>
            <Plus size={16} aria-hidden />{t('add')}
          </button>
          {form.atLimit && <p className={styles.limitHint}>{t('addLimit', { max: MAX_CHAPTERS })}</p>}
        </>
      )}

      {(hasRows || form.dirty) && (
        <div className={styles.footer}>
          <Button type="button" size="lg" onClick={form.save} disabled={!form.canSave}>
            {form.saving && <span className={styles.spinner} aria-hidden />}
            {form.saving ? t('saving') : t('save')}
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={form.discard} disabled={!form.dirty || form.saving}>
            {t('discard')}
          </Button>
          <span className={styles.spacer} />
          {form.invalidCount > 0 && <span className={styles.pending}>{t('pending', { count: form.invalidCount })}</span>}
        </div>
      )}

      <Dialog open={form.pendingImport} onOpenChange={(open) => !open && form.cancelImport()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('replaceTitle')}</DialogTitle>
            <DialogDescription>{t('replaceText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={form.cancelImport}>{t('replaceCancel')}</Button>
            <Button type="button" onClick={form.confirmImport}>{t('replaceConfirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
