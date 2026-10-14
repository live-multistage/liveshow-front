'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { ReplayChapter, ReplayEventTimeline } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import {
  useReplaceReplayChaptersMutation,
  useReplayChapterSuggestionsMutation,
} from '../mutations/replay-chapters.mutations';
import {
  draftsFromChapters,
  draftsFromSuggestions,
  formatOffset,
  parseOffset,
  serverErrorIndex,
  sortDraftsByStart,
  toReplaceRequest,
  validateDrafts,
  type ChapterDraft,
  type DraftError,
} from '../utils/replay-chapter-drafts';

export const MAX_CHAPTERS = 200;

interface Options {
  eventId: string;
  chapters: ReplayChapter[];
  window: ReplayEventTimeline;
  multiStage: boolean;
}

interface ServerRowError {
  key: string;
  message: string;
}

// The backend prefixes its 400s with the position; the card already says which
// chapter it is, so only the reason is shown.
const reasonOf = (message: string) => message.replace(/^chapter at position \d+:\s*/, '');

export function useReplayChaptersForm({ eventId, chapters, window, multiStage }: Options) {
  const t = useTranslations('replayChaptersEditor');
  const replace = useReplaceReplayChaptersMutation(eventId);
  const suggestions = useReplayChapterSuggestionsMutation(eventId);
  const span = window.endsAtMs - window.startsAtMs;

  const [drafts, setDrafts] = useState<ChapterDraft[]>(() => draftsFromChapters(chapters, window));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ServerRowError | null>(null);
  const [replayGone, setReplayGone] = useState(false);
  const [pendingImport, setPendingImport] = useState<ChapterDraft[] | null>(null);
  const newKey = useRef(0);

  // Re-seed whenever the loaded data changes: first load, and after a save the
  // mutation writes the server's normalised list back into the cache.
  useEffect(() => {
    setDrafts(draftsFromChapters(chapters, window));
    setDirty(false);
    setServerError(null);
  }, [chapters, window]);

  const errors = useMemo<DraftError[][]>(
    () => validateDrafts(drafts, window, { multiStage }),
    [drafts, window, multiStage],
  );
  const invalidCount = errors.filter((e) => e.length > 0).length + (serverError ? 1 : 0);
  const atLimit = drafts.length >= MAX_CHAPTERS;
  const canSave = dirty && !saving && invalidCount === 0;

  const edit = useCallback((next: (prev: ChapterDraft[]) => ChapterDraft[]) => {
    setDrafts(next);
    setDirty(true);
    setServerError(null);
  }, []);

  const update = (key: string, patch: Partial<ChapterDraft>) =>
    edit((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch, importIssues: [] } : d)));

  const remove = (key: string) => edit((prev) => prev.filter((d) => d.key !== key));

  const add = () => {
    if (atLimit) return;
    const lastEnd = Math.max(-1, ...drafts.map((d) => parseOffset(d.endText) ?? -1));
    newKey.current += 1;
    edit((prev) => [
      ...prev,
      {
        key: `new-${newKey.current}`,
        startText: formatOffset(Math.max(0, lastEnd), span),
        endText: '',
        title: '',
        description: '',
        stageId: null,
        artistIds: [],
        importIssues: [],
      },
    ]);
  };

  const sort = () => setDrafts((prev) => sortDraftsByStart(prev));

  const discard = () => {
    setDrafts(draftsFromChapters(chapters, window));
    setDirty(false);
    setServerError(null);
  };

  const applyImport = (imported: ChapterDraft[]) => {
    edit(() => sortDraftsByStart(imported).slice(0, MAX_CHAPTERS));
    setPendingImport(null);
  };

  const requestImport = async () => {
    try {
      const found = await suggestions.mutateAsync();
      if (found.length === 0) {
        toast.info(t('importEmpty'));
        return;
      }
      const imported = draftsFromSuggestions(found, window).map((d) => (multiStage ? d : { ...d, stageId: null }));
      if (drafts.length > 0) setPendingImport(imported);
      else applyImport(imported);
    } catch {
      toast.error(t('importError'));
    }
  };

  const save = async () => {
    if (!canSave) return;
    const sorted = sortDraftsByStart(drafts);
    setDrafts(sorted);
    setSaving(true);
    try {
      const body = toReplaceRequest(sorted, window);
      // A single-stage event has no stage field: chapters always cover everything.
      const chaptersToSend = multiStage ? body.chapters : body.chapters.map((c) => ({ ...c, stageId: null }));
      await replace.mutateAsync({ chapters: chaptersToSend });
      setDirty(false);
      toast.success(t('saved'));
    } catch (e) {
      const { status, message } = e as AppError;
      const index = status === 400 ? serverErrorIndex(message) : null;
      if (status === 409) setReplayGone(true);
      else if (index !== null && sorted[index]) setServerError({ key: sorted[index].key, message: reasonOf(message) });
      else toast.error(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return {
    drafts,
    errors,
    serverError,
    invalidCount,
    dirty,
    saving,
    canSave,
    atLimit,
    replayGone,
    importing: suggestions.isPending,
    pendingImport: pendingImport !== null,
    update,
    remove,
    add,
    sort,
    discard,
    save,
    requestImport,
    confirmImport: () => pendingImport && applyImport(pendingImport),
    cancelImport: () => setPendingImport(null),
  };
}
